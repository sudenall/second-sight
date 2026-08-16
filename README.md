# Second Sight

*A second brain that remembers what you forgot to review.*

A personal "second brain" system that turns knowledge learned from pinned
chats on claude.ai into a categorized, relational Obsidian knowledge base
(and eventually a web interface).

> This repo contains **infrastructure only**: the dashboard script, the sync
> tool, and documentation. The actual note content (`Notes/`, `_staging/`,
> `_manifest.json`, `_index/`) is intentionally not here — it lives in a
> separate **private** repo. See the
> [Public/private repo split](#publicprivate-repo-split) section for
> details.

## Problem it solves

A lot gets learned over time in claude.ai conversations, but that knowledge
stays buried in chat history. Recalling or applying something later means
digging back through old chats — slow, and it also prevents learned
knowledge from connecting to other knowledge (growing into a relational
network). Second Sight extracts this knowledge from conversations and turns
it into atomic, interlinked notes, moving it into a permanent, searchable,
reviewable system.

## Architecture

```
pinned claude.ai chats
        │  (Claude Cowork - manual/browser-driven)
        ▼
   Layer A: Manifest comparison
   (title + last-modified → only CHANGED chats proceed)
        ▼
   Layer B: Raw extraction → _staging/*.md
   (no categorization yet, no learning unit skipped)
        │  (Claude Code)
        ▼
   Layer C: Categorize + relate
   (fast matching via _index/*.json, appends a dated entry to an existing
    topic note or creates a new one, updates manifest/index, deletes the
    staging file)
        ▼
   Layer D: Dashboard (Reminders/Home.md)
   (Dataview/DataviewJS, fully local, no AI calls)
```

### Layer A — Manifest check

Before a chat's full content is opened, only its title and last-modified
info are compared against `last_seen_modified` in `_manifest.json`. If they
match, the chat is skipped entirely. This prevents every run from
reprocessing all chats (and the unnecessary AI/compute cost that would
entail).

### Layer B — Raw extraction

Only chats where a difference was found have their content opened, and it's
written to the `_staging/` folder as raw text without any
decision-making/analysis. See [`_staging/README.md`](_staging/README.md)
for the format details.

### Layer C — Categorize + relate

The unit of knowledge is a **topic**, not an individual concept. A pinned
chat usually produces a single topic note under `Notes/` (e.g. `MCP.md`,
`Cache-Stampede.md`); it only gets split into multiple notes if the chat
genuinely covers two or three disconnected, unrelated topics.

For each file in `_staging/`, `_index/topics.json` (a
`{"topic-key": "Notes/File-Name.md"}` lookup) is checked first — if the
chat matches an existing topic note, a new **dated entry** is appended
inside that note rather than creating a new file; if there's no match, a
new topic note is created and registered in `topics.json`. No separate
session note is produced — all knowledge lives inside the topic note's
entries.

Each entry is its own `## [Date] — [Short Label]` heading inside the note,
tracked in the frontmatter's `entries` list (`date`, `label`, `anchor`,
`review_due` = `date + 3 days`, `last_reminded`). The `anchor` field is the
heading's literal text (not a slug), matching how Obsidian's
`[[Note#Heading]]` link syntax actually resolves. The note's body is
Turkish, followed by a full English translation appended after a
`---\n## English Version` separator, for a future web TR/EN toggle.

**Two-tier categorization**: `category` (a broad top-level heading, e.g.
"AI Certified Architect") and `subcategory` (more specific, under that
top-level heading, e.g. "Claude Developer Platform"), tracked in
`_index/categories.json` — each `category` carries its own `subcategories`
list. If none of the existing ones fit, approval is requested before adding
a new one.

Completeness rule: every distinct learning unit that appears in a chat
(concept, technique/method, architectural decision, problem, solution,
corrected misunderstanding, comparison/trade-off) becomes its own entry —
nothing is skipped just because it seems minor, and any gaps caused by
extraction limitations (missing pagination, an interrupted response) are
noted explicitly rather than silently dropped.

### Layer D — Dashboard

`Reminders/Home.md` computes category-based tables and the weekly/monthly
reminder tables — entry by entry across every topic note's `entries` list —
using Dataview/DataviewJS. Set up once, it then runs automatically and for
free every time Obsidian opens.

## Cost-efficiency approach

- **Manifest**: unchanged chats are never opened at all.
- **Staging**: raw extraction and categorize/relate are separate steps —
  neither retriggers the other.
- **Index (categories.json / tags.json)**: relating notes scans small index
  files instead of the whole vault.
- **Dashboard**: fully local Dataview/DataviewJS, no AI calls required.

## Public/private repo split

The same vault folder is tracked by **two independent git repos**
(the `git --git-dir` technique, two separate `.git` directories in the same
folder):

| Repo | Git directory | Content | Visibility |
|---|---|---|---|
| `second-sight` (this repo) | `.git-public` | `Reminders/Home.md`, `README.md`, `SCHEDULING.md`, `sync.ps1`, `web-app/`, `installer/`, `.gitignore` | Public |
| `second-sight-vault` | `.git-private` | `Notes/`, `_staging/`, `_manifest.json`, `_index/` | Private |

The vault's folder structure stays exactly as specified, as one single
tree; only the git side keeps two separate histories.

### Synchronization

After creating/editing notes in Obsidian as usual, a single command:

```powershell
powershell -File sync.ps1
```

This script stages both repos with their own file list and commits + pushes
if there are changes. You don't need to think about which file goes to
which repo — the script handles that automatically via the `publicPaths` /
`privatePaths` lists. For fully automatic (scheduled) runs, see
[`SCHEDULING.md`](SCHEDULING.md).

## Tools used

- **Obsidian** — the vault, with the Dataview plugin (already installed)
- **Claude Cowork** — pinned chat scanning (Layer A/B), triggered manually
  via the claude.ai account
- **Claude Code** — categorize/relate (Layer C), processes staging files
- **Git / GitHub** — two independent repos (public infrastructure, private
  vault)
- **PowerShell** — sync via `sync.ps1`

## Status

The folder structure, index/manifest skeletons, and dashboard are set up,
and Layer C is live — processing real pinned chats into topic notes. A web
interface (`web-app/`) has also been built, with deployment steps documented
in [`web-app/README-DEPLOY.md`](web-app/README-DEPLOY.md) and
[`installer/SETUP-GUIDE.md`](installer/SETUP-GUIDE.md).
