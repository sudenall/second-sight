# Second Sight — Setup Guide

Second Sight turns knowledge from pinned chats on claude.ai into a
categorized, reviewable Obsidian vault — and optionally, a private web
view you can check from anywhere. This guide walks through the full
setup, in order. Each step notes the mistakes that came up while
building this system in the first place, so you don't have to hit them
yourself.

You don't need every step. Steps 1–2 give you a working local system
(Obsidian only). Steps 3–5 are only needed if you also want a hosted web
view.

## Before you start

You'll need:

- **Windows, or PowerShell installed on macOS/Linux** (as `pwsh`) — the
  installer (`install.ps1`) is a PowerShell script.
- **Obsidian**, with the **Dataview** community plugin installed — the
  dashboard depends on it.
- **A claude.ai account**, with **Cowork/Routines** available on it (check
  your plan tier — see the note in Step 2).
- *(Only if you want a hosted web view, Steps 3–5)* a **GitHub** account
  and a **Cloudflare** account.

And one action, before any of the steps below: **pin the claude.ai
conversations** you want this system to pick up. Cowork only scans chats
you've pinned — anything unpinned is invisible to it, no matter how the
routine below is set up.

## Step 1 — Run the installer

1. Download or clone this repo somewhere on your machine.
2. Open PowerShell and run:
   ```powershell
   cd installer
   .\install.ps1
   ```
3. When prompted, enter the full path to the Obsidian vault you want to
   turn into a Second Sight vault (an existing vault, or a brand new
   empty folder you'll open in Obsidian afterward).
4. The script creates `Notes/`, `Weekly-Summaries/`, `Reminders/`,
   `_staging/`, `_index/`, `SCHEDULING/`, a starter dashboard
   (`Reminders/Home.md`), and the note-processing instructions file.
5. Open that folder as a vault in Obsidian (or reload it, if it was
   already open). Install the **Dataview** community plugin if you don't
   already have it — the dashboard depends on it.

If the script tells you a setup already exists in that folder, it means
it found a `Notes/` folder or an instructions file there already.
Answering "n" leaves everything untouched.

## Step 2 — Set up the Cowork routine

This is what actually pulls content out of your pinned claude.ai chats
on a schedule, so you don't have to run anything by hand.

> **Plan tier note:** Cowork/Routines availability depends on your
> claude.ai plan — check your account settings to confirm you have access
> before relying on this step. If it's not available on your plan, you can
> still run the same prompt manually from time to time instead of on a
> schedule.

1. In Claude, go to the Cowork/Routines settings for your account and
   create a new scheduled routine (weekly is reasonable — pinned chats
   don't usually pile up faster than that).
2. Paste in the following prompt, **replacing the bracketed
   placeholders with your own values** first:

   ```
   Scan my pinned chats on claude.ai. For each one, compare its title
   and last-modified time against _manifest.json in my Obsidian vault
   at [YOUR VAULT PATH] - skip any chat that hasn't changed since it was
   last processed. For every chat that's new or has changed, open it and
   copy its raw content into a new file under _staging/ in that vault
   (no summarizing or categorizing yet - just the raw content, plus a
   header noting the source chat's title and URL).

   Once every changed chat has been extracted this way, follow the
   instructions in SCHEDULING/note-processing-instructions.md (in the
   same vault) to turn everything in _staging/ into notes.

   Don't stop to ask me for approval at each step - make reasonable
   calls yourself and keep going. When you're done, give me a short
   summary of what was processed.
   ```

3. Save the routine. It'll run on its own from then on — you shouldn't
   need to touch it again unless you change your vault's location.

**Why it's written this way:** early versions of this system used
internal names for each stage of the process (things like "Layer A" /
"Layer B" / "Layer C"). Those names meant nothing outside the project
that invented them, so the instructions above just describe what
actually happens at each stage instead.

## Step 3 — Two-repo GitHub setup (public code, private notes)

This step is only needed if you want a hosted web view later (Step 4).
If you're happy keeping everything local in Obsidian, skip to "You're
done" at the bottom.

The idea: your actual notes (which might contain personal or
sensitive content) live in a **private** GitHub repo, while the
dashboard/website code lives in a **public** one — so you can host a
free public-tier site without publishing your notes. Both repos track
the *same* folder on your machine, using two separate `.git` directories
instead of one:

1. Create two empty repos on GitHub: one public (e.g. `second-sight`),
   one private (e.g. `second-sight-vault`).
2. In your vault folder, initialize both, pointing each at its own git
   directory:
   ```powershell
   git init --separate-git-dir=.git-public
   git remote add origin https://github.com/<you>/second-sight.git
   ```
   Then repeat with a second git-dir for the private repo:
   ```powershell
   git --git-dir=.git-private init
   git --git-dir=.git-private remote add origin https://github.com/<you>/second-sight-vault.git
   ```
3. Copy `sync.ps1` from the root of this repo into your vault folder, and
   edit its `$publicPaths` / `$privatePaths` lists at the top to match your
   own folder names. It already does the right thing: stages a different
   explicit file list for each repo (public: dashboard, install scripts,
   docs; private: `Notes/`, `_staging/`, `_index/`, `_manifest.json`) and
   commits + pushes each one with `git --git-dir=<dir> --work-tree=. ...`.
   You don't need to write this from scratch — just adapt the path lists.
   Explicit path lists matter here — `git add -A` on either repo would leak
   files meant for the other one.
4. Add a `.gitignore` at the vault root with at least `.obsidian/` in it
   (Obsidian's local app state shouldn't be tracked by either repo).

## Step 4 — Deploy the web view (Cloudflare Pages)

The web app lives in `web-app/`. It needs to read `Notes/` and `_index/`
from your **private** repo at build time, but Cloudflare's Git
integration only checks out the **public** repo by default — so the
build step has to separately clone the private repo (with a read-only
token) before running `astro build`, and then hand the result to
Wrangler to actually publish.

This is the part that's easiest to get subtly wrong, because the three
mistakes below don't look related to each other, but they all come from
the same root cause: **the "Root directory" setting in the Cloudflare
dashboard already puts the build command's working directory inside
`web-app/`** — every command below has to be written with that in mind,
not with "I'm starting from the repo root" in mind.

Setup, in order:

1. In the Cloudflare dashboard, create a Worker via **Create a Worker**
   (not the older, separate "Pages" product) → **Connect to Git** → pick
   your public repo.
2. Set **Root directory** to `/web-app`.
3. Set the **Build command** and add the environment variables as
   described in the three fixes below.
4. `web-app/wrangler.jsonc` needs to exist in your repo (see Error 1) —
   it's what tells Wrangler where the built site lives.

### Error 1 — Build command left empty

The "Build command" field in the newer "Create a Worker" → Connect-to-Git
flow *looks* optional (it shows a loading/placeholder state), but it
isn't. Leaving it empty produces a deploy-time error along the lines of:

```
npx wrangler deploy expects a wrangler.jsonc, but none was found
```

**Fix:** add `web-app/wrangler.jsonc`:

```jsonc
{
  "name": "second-sight",
  "compatibility_date": "REPLACE-WITH-TODAYS-DATE",  // format: YYYY-MM-DD
  "assets": { "directory": "./dist" }
}
```

...and make sure the build command actually ends with `npx wrangler deploy`
so Wrangler runs and reads that config (see the full command at the end
of this section — this fix alone isn't enough by itself, Errors 2 and 3
below affect the same command).

### Error 2 — An extra `cd` inside the build command

Because **Root directory** is already set to `/web-app` (step 2 above),
Cloudflare starts the build command *from inside* `web-app/` — you're
already there before your command runs.

❌ **Wrong** (this was the first attempt):
```bash
cd web-app && npm install && VAULT_DATA_DIR=$(pwd)/../vault-data npm run build
```
This fails with:
```
cd: can't cd to web-app
```
...because there's no `web-app/web-app/` to cd into — you're already
sitting in `web-app/`.

✅ **Fix:** drop the `cd web-app &&` entirely. Don't re-enter a directory
you're already in:
```bash
npm install && VAULT_DATA_DIR=$(pwd)/../vault-data npm run build
```
(Note: this alone still isn't correct — see Error 3, since `../vault-data`
is now also wrong once the `cd` is removed.)

### Error 3 — `VAULT_DATA_DIR` pointed one directory too high

The private vault repo gets cloned with a plain `git clone ... vault-data`
— no path prefix. Since the command is already running from inside
`web-app/` (Root directory setting), that clone lands at
`web-app/vault-data`, not at the repo root.

❌ **Wrong:**
```bash
VAULT_DATA_DIR=$(pwd)/../vault-data npm run build
```
`$(pwd)` here is already `.../web-app`, so `../vault-data` resolves to
the *repo root's* `vault-data` — which doesn't exist, since the clone
actually happened one level down, inside `web-app/`. The build didn't
fail outright; it just silently found no vault content, and Astro logged
warnings like `Concepts/ folder not found` while still producing a
(content-empty) `dist/` — which is the more dangerous kind of bug, since
the deploy looks successful.

✅ **Fix:** point at the clone's actual location, one level lower than
the mistaken version:
```bash
VAULT_DATA_DIR=$(pwd)/vault-data npm run build
```

### Putting it together — the actual working build command

All three fixes land in one single-line build command (reconstructed
from the three fixes above — if your final working command in the
Cloudflare dashboard differs from this, trust what's actually in your
dashboard over this doc):

```bash
git clone --depth 1 https://x-access-token:$VAULT_REPO_TOKEN@github.com/<you>/second-sight-vault.git vault-data && npm install && VAULT_DATA_DIR=$(pwd)/vault-data npm run build && npx wrangler deploy
```

Line by line: clone the private vault repo into `web-app/vault-data`
(no `cd`, we're already in `web-app/` — Error 2's fix) → install
dependencies → build with `VAULT_DATA_DIR` pointing at the sibling
`vault-data` folder we just cloned, not a level above it (Error 3's fix)
→ explicitly invoke `npx wrangler deploy` at the end so Wrangler actually
publishes `./dist` per `wrangler.jsonc` (Error 1's fix).

Also add `VAULT_REPO_TOKEN` as an encrypted environment variable in the
same dashboard section (a read-only, fine-grained GitHub token scoped to
just the private repo's contents) — same idea as Step 3, just consumed
here instead of on your own machine.

## Step 5 — Restrict access with Cloudflare Access

Once deployed, the site is public by default — anyone with the URL can
see it. This step puts an email-based login in front of it.

1. In the Cloudflare dashboard, go to **Zero Trust** →
   **Access → Applications → Add an application** → **Self-hosted**.
2. Set the application domain to your Pages site's URL.
3. Add a policy that allows only your own email address.
4. For the actual login method (how visitors prove it's really them):
   look under **Zero Trust → Settings → Authentication** for the
   **One-time PIN** method — this emails a short-lived code to the
   address entered, no account/password needed on the visitor's end.

**If you can't find it there, or it doesn't work:** this is a known rough
edge — the exact location/behavior of this setting has moved around in
Cloudflare's dashboard before. As a fallback, Cloudflare Access also
supports an "only while actively logged in" session mode instead of
email-OTP — it's less convenient (you re-authenticate more often) but
more reliably available across dashboard versions. Use that if One-time
PIN gives you trouble.

---

## You're done

- **Local only:** after Step 1, open `Reminders/Home.md` in Obsidian —
  once your routine (Step 2) has processed a chat or two, the dashboard
  fills in on its own.
- **With a web view:** after Step 5, your dashboard is also reachable
  from a private URL, behind your own email login.
