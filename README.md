# Second Sight

*A second brain that remembers what you forgot to review.*

A personal "second brain" system that turns knowledge learned from pinned
chats on claude.ai into a categorized, relational Obsidian knowledge base
(and eventually a web interface).

> This repo contains **infrastructure only**: templates, the dashboard
> script, the sync tool, and documentation. The actual note content
> (Sessions/, Concepts/, Weekly-Summaries/, `_staging/`, `_manifest.json`,
> `_index/`) is intentionally not here — it lives in a separate **private**
> repo. See the [Public/private repo split](#publicprivate-repo-split)
> section for details.

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
   (fast matching via _index/*.json, generates Session+Concept notes,
    updates manifest/index, deletes the staging file)
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

For each file in `_staging/`, `_index/categories.json` and
`_index/tags.json` are checked first (the whole vault isn't scanned); if a
match with an existing note is found, `related` fields are linked
bidirectionally. Session + Concept notes are generated, and
`review_due = date_learned + 3 days` is calculated. Once done, the
manifest/index is updated and the processed `_staging` file is deleted.

**Two-tier categorization**: `category` (a broad top-level heading, e.g.
"AI Certified Architect") and `subcategory` (more specific, under that
top-level heading, e.g. "Claude Developer Platform"). Both form a flexible,
growing taxonomy — in `_index/categories.json`, each `category` carries its
own `subcategories` list. If none of the existing ones fit (whether
category or subcategory), approval is requested before adding a new one.

Completeness rule: every distinct learning unit that appears in a chat
(concept, technique/method, architectural decision, problem, solution,
corrected misunderstanding, comparison/trade-off) is a candidate for its
own concept note. Nothing is skipped just because it seems minor; at most
two small, closely related sub-concepts may be merged into a single note.

### Layer D — Dashboard

`Reminders/Home.md` computes category-based tables and the weekly reminder
table using Dataview/DataviewJS. Set up once, it then runs automatically
and for free every time Obsidian opens.

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
| `second-sight` (this repo) | `.git-public` | `_templates/`, `Reminders/Home.md`, `README.md`, `SCHEDULING.md`, `sync.ps1`, `.gitignore` | Public |
| `second-sight-vault` | `.git-private` | `Sessions/`, `Concepts/`, `Weekly-Summaries/`, `_staging/`, `_manifest.json`, `_index/` | Private |

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

- **Obsidian** — the vault, with the Dataview and Templater plugins
  (already installed)
- **Claude Cowork** — pinned chat scanning (Layer A/B), triggered manually
  via the claude.ai account
- **Claude Code** — categorize/relate (Layer C), processes staging files
- **Git / GitHub** — two independent repos (public infrastructure, private
  vault)
- **PowerShell** — sync via `sync.ps1`

## Status

The folder structure, templates, index/manifest skeletons, and dashboard
are set up. The web interface phase hasn't started yet — Layer C is
currently being tested with fictional sample data.
