import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getVaultDataDir } from "../lib/vault-dir.mjs";

const vaultDir = getVaultDataDir();

// On Windows, a raw "D:\..." string gets misread as a URL with scheme "d:"
// somewhere in Astro's glob loader - pass a proper file:// URL instead.
function base(...segments: string[]) {
  return pathToFileURL(path.join(vaultDir, ...segments) + path.sep).href;
}

// Frontmatter date-like fields can arrive as a plain "YYYY-MM-DD" string
// OR as a native Date (YAML 1.1 implicit-typing parsers sometimes coerce
// unquoted date-looking scalars automatically - this bit us once already
// in the Dataview dashboard, see Reminders/Home.md). Normalize both cases
// to a plain ISO date string so the rest of the app only ever deals with
// one type.
const dateLike = z
  .union([z.string(), z.date()])
  .optional()
  .default("")
  .transform((v) => {
    if (!v) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return v;
  });

const concepts = defineCollection({
  loader: glob({ pattern: "*.md", base: base("Concepts") }),
  schema: z.object({
    type: z.literal("concept"),
    title: z.string(),
    title_en: z.string().optional().default(""),
    date_learned: dateLike,
    parent_session: z.string().optional().default(""),
    category: z.string(),
    subcategory: z.string(),
    tags: z.array(z.string()).default([]),
    difficulty: z.string().optional().default(""),
    review_due: dateLike,
    last_reminded: dateLike,
    status: z.string().optional().default(""),
    related: z.array(z.string()).default([]),
  }),
});

const sessions = defineCollection({
  loader: glob({ pattern: "*.md", base: base("Sessions") }),
  schema: z.object({
    type: z.literal("session"),
    title: z.string(),
    title_en: z.string().optional().default(""),
    date_learned: dateLike,
    source_url: z.string().optional().default(""),
    category: z.string(),
    subcategory: z.string(),
    concepts: z.array(z.string()).default([]),
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

export const collections = { concepts, sessions, weeklySummaries };
