# Note Processing Instructions

Give this file to Claude (paste it into a chat, or reference it in an
automated routine) whenever you have raw chat content ready to turn into
notes. It describes the whole process end to end.

## What to do

Process every file in the `_staging/` folder:

1. **Categorize.** Check `_index/categories.json` for existing
   categories/subcategories. If nothing fits, pick a reasonable,
   sensibly-named new one rather than forcing a bad match.
2. **Check for an existing note first.** Look at `_index/topics.json` —
   it's a simple map of `{"topic-key": "Notes/File-Name.md"}`. Look for a
   semantic match (not just exact string match) between the new chat's
   topic and an existing entry.
   - **Match found** → add a new dated entry *inside* that existing note
     (see "Note structure" below). Don't create a second note for the
     same topic.
   - **No match** → create a new topic note and register it in
     `topics.json`.
3. **No separate "session" notes.** All knowledge lives inside the dated
   entries of the topic note itself — don't create a second file just to
   record "what happened in this chat."
4. **Clean up after processing.** Update `_manifest.json` so this chat
   isn't reprocessed next time, and delete the staging file once it's
   been turned into a note (or a new entry in an existing note).
5. **Generate/update this week's summary.** See "Weekly summary" below.
6. Don't wait for approval at each step — make reasonable calls yourself
   and keep going. If you're running this by hand instead of on a
   schedule, a short summary of what got processed is enough at the end.

## Note structure: one note per topic, with dated entries

The unit here is a **topic**, not a single fact. One pinned chat usually
produces exactly one topic note (e.g. `Circuit-Breaker-Pattern.md`). Only
split a chat into multiple notes if it genuinely covers two or three
unrelated topics.

Inside a topic note, every time you learn something new about that topic
(in a new chat, or a follow-up in the same chat on a different day), it
becomes its own entry: a `## [Date] — [Short Label]` heading in the body,
plus a matching item in the `entries` list in the frontmatter. Example:

```markdown
---
type: note
title: "Circuit Breaker Pattern"
category: "Software Architecture"
subcategory: "Resilience Patterns"
tags: [resilience, distributed-systems]
entries:
  - date: 2026-08-01
    label: "What It Is, the Three States"
    anchor: "August 1 — What It Is, the Three States"
    review_due: 2026-08-04
    last_reminded: ""
  - date: 2026-08-15
    label: "Half-Open State and Failure Thresholds"
    anchor: "August 15 — Half-Open State and Failure Thresholds"
    review_due: 2026-08-18
    last_reminded: ""
---
## August 1 — What It Is, the Three States
(narrative...)

## August 15 — Half-Open State and Failure Thresholds
(new entry...)
```

A few details that matter:

- **`review_due`** = `date` + 3 days. Leave `last_reminded` empty for a
  new entry — that field only gets filled in when you actually review it
  later (from the dashboard).
- **`anchor` is the heading's literal text, not a URL-style slug.**
  Obsidian's `[[Note#Heading]]` link syntax resolves against the exact
  heading text, so `anchor` must match the `## [Date] — [Label]` heading
  character-for-character (spacing, punctuation, everything) — no
  slugified version.
- **No fixed template for the body.** Let each entry follow the natural
  shape of what was actually discussed. A few optional markers can help
  if they genuinely apply — don't force them into every entry:
  - 🔑 the specific point that was confusing or hard to get right
  - 📝 how it tends to show up in practice / in an exam / in real use
  - ✅ a one-sentence summary
- **Preserve the back-and-forth.** If the first explanation didn't land
  and a second or third attempt actually clarified it, keep that
  trajectory rather than only writing down the final, clean version —
  the confusion is often the most useful part to have on record.
- **Match the existing voice.** Before adding a new entry to a note that
  already has content, skim its existing entries (or another note in the
  vault) and keep a consistent tone rather than switching style
  mid-note.

## Writing style

Write each entry as connected, explanatory prose — the way someone
would actually explain the topic out loud, with transitions ("this means
that...", "the reason this happens is...", "which is why..."), not as a
disconnected list of fragments. Introduce the general shape of the idea
first, then go into detail. Reserve bullet points/lists for content
that's genuinely a set of discrete, parallel items — don't chop a
continuous explanation into bullets just to make it look tidy.

## Cross-referencing between notes

If a note mentions another topic that already has its own note (check
`topics.json`), that mention should be a real `[[Note-Name]]` link, not
just plain text naming the other topic. When you add a link like this,
add the reciprocal link on the other side too (a short line near the
end of the most relevant entry works well, e.g. "**Related:** see
[[Other-Note]]") — links should go both ways, not just from the newer
note to the older one. Link targets are the file name without the `.md`
extension and without the `Notes/` prefix, e.g. `[[Circuit-Breaker-Pattern]]`;
`[[Note-Name#Some Heading]]` also works if you need to point at a
specific section rather than the whole note. This keeps the graph view
meaningful and makes it possible to actually navigate between related
notes instead of everything being an island.

## Weekly summary

Once you're done processing (and at least one staging file was actually
turned into a note or a new entry this run), check whether
`Weekly-Summaries/` has a file for the current ISO 8601 week (e.g. the
34th week of 2026 → `Weekly-Summaries/2026-W34.md`).

If it doesn't exist, create it; if it does, update it:

```markdown
---
type: weekly-summary
week: '2026-W34'
---
## Topics Added or Updated This Week
(for every entry processed this week: [[Note-Name]] - one short sentence
on what was learned or what was hard to get right in that entry)

## Pattern Observed
(2-3 sentences: what topic area got the most attention this week, any
connection to previous weeks, an observation drawn from looking at the
vault's existing notes)
```

If the file already exists (this process ran more than once in the same
week), add the new entries to the list rather than duplicating it, and
rewrite the "Pattern Observed" section to reflect the full week so far,
not just this run.

This file is completely separate from the reminder tables in the
dashboard (`Reminders/Home.md`) — it doesn't use `review_due` or
`last_reminded`, doesn't track an `entries` list, and never feeds into
the reminder system. It's just a running log for your own reference.

## A note on language

These instructions and the example above are in English, but the actual
language your notes end up in should just match whatever language you
naturally think and write in — there's no requirement to write in
English specifically. If you *do* want a bilingual setup (e.g. writing
your notes in one language and keeping a full translation in another for
a future web view), that's a pattern you can layer on top of this
structure yourself: write the body normally, then append a translated
copy of the whole thing after a `---` separator and a
`## [Language] Version` heading at the end of the file.
