import type { CollectionEntry } from "astro:content";
import { normalizeAnchorText } from "./normalize-anchor.mjs";

// Mirrors Reminders/Home.md's flattenEntries() (the Obsidian dashboard):
// each topic note's entries[] list becomes independent, self-contained
// units - one per dated entry, not one per note. Entries without a date
// (the deliberately-undated ones, e.g. a chat with no recoverable date
// hint) are skipped here too, same as the Obsidian side - they simply
// never show up in reminder/retrospective tables until a real date is
// filled in.
export interface FlatEntry {
  noteSlug: string;
  noteTitle: string;
  noteTitleEn: string;
  category: string;
  subcategory: string;
  date: string;
  label: string;
  reviewDue: string;
  lastReminded: string;
  headingSlug: string;
}

export function flattenNoteEntries(notes: CollectionEntry<"notes">[]): FlatEntry[] {
  const flat: FlatEntry[] = [];
  for (const note of notes) {
    for (const entry of note.data.entries) {
      if (!entry.date) continue;
      flat.push({
        noteSlug: note.id,
        noteTitle: note.data.title,
        noteTitleEn: note.data.title_en,
        category: note.data.category,
        subcategory: note.data.subcategory,
        date: entry.date,
        label: entry.label,
        reviewDue: entry.review_due,
        lastReminded: entry.last_reminded,
        // Falls back to the raw anchor text if, for some reason, the
        // loader couldn't match a heading (shouldn't happen - every entry
        // anchor is required to be the literal text of a real ## heading
        // - but a same-page fragment beats a dead link).
        headingSlug: note.data.entryAnchorMap[normalizeAnchorText(entry.anchor)] ?? "",
      });
    }
  }
  return flat;
}
