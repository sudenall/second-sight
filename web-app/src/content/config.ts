import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getVaultDataDir } from "../lib/vault-dir.mjs";
import { notesLoader } from "../lib/notes-loader.mjs";

const vaultDir = getVaultDataDir();

// On Windows, a raw "D:\..." string gets misread as a URL with scheme "d:"
// somewhere in Astro's glob loader - pass a proper file:// URL instead.
function base(...segments: string[]) {
  return pathToFileURL(path.join(vaultDir, ...segments) + path.sep).href;
}

// notesLoader (our custom loader) reads the filesystem directly with
// node:fs, so it needs a plain OS path, not a file:// URL.
function baseDir(...segments: string[]) {
  return path.join(vaultDir, ...segments);
}

// Frontmatter date-like fields can arrive as a plain "YYYY-MM-DD" string
// OR as a native Date (YAML 1.1 implicit-typing parsers sometimes coerce
// unquoted date-looking scalars automatically - this bit us once already
// in the Dataview dashboard, see Reminders/Home.md). Normalize both cases
// to a plain ISO date string so the rest of the app only ever deals with
// one type.
const dateLike = z
  .union([z.string(), z.date()])
  .nullable()
  .optional()
  .default("")
  .transform((v) => {
    if (!v) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return v;
  });

// v2 model: a topic note under Notes/ with a list of dated entries, each
// its own "## [Date] — [Label]" section in the body. The body itself is
// split (by notesLoader, see src/lib/notes-loader.mjs) into a Turkish half
// and an English half at the "---\n## English Version" marker - the
// Turkish half renders as the normal <Content /> via entry.rendered, the
// English half is precomputed HTML in entry.data.enHtml.
//
// entryAnchorMap (also populated by notesLoader) maps each entry's literal
// `anchor` frontmatter text to the actual heading id Astro's markdown
// pipeline generated for it (from entry.rendered.metadata.headings) - so
// links to a specific entry can point at /notes/<slug>/#<real-heading-id>
// instead of guessing a slug independently.
const notes = defineCollection({
  loader: notesLoader({ base: baseDir("Notes") }),
  schema: z.object({
    type: z.literal("note"),
    title: z.string(),
    title_en: z.string().optional().default(""),
    category: z.string(),
    subcategory: z.string(),
    tags: z.array(z.string()).default([]),
    entries: z
      .array(
        z.object({
          date: dateLike,
          label: z.string(),
          anchor: z.string(),
          review_due: dateLike,
          last_reminded: dateLike,
        }),
      )
      .default([]),
    // Populated by notesLoader, not present in the file's frontmatter.
    enHtml: z.string().optional().default(""),
    entryAnchorMap: z.record(z.string()).optional().default({}),
  }),
});

const weeklySummaries = defineCollection({
  loader: glob({ pattern: "*.md", base: base("Weekly-Summaries") }),
  schema: z.object({
    type: z.literal("weekly-summary").optional(),
    week: z.string().optional().default(""),
    category: z.string().optional().default(""),
    subcategory: z.string().optional().default(""),
  }),
});

export const collections = { weeklySummaries, notes };
