// Astro's markdown pipeline applies smartypants-style typography when
// rendering to HTML: straight quotes/apostrophes in the source ('...',
// "...") become curly ones (’, ‘, “, ”) in the extracted heading text
// (entry.rendered.metadata.headings[].text). Frontmatter's `entries[].anchor`
// strings are copied verbatim from raw markdown headings, so they still
// have straight quotes - comparing the two as-is silently fails to match
// on any anchor containing an apostrophe or quote. Normalizing both sides
// through this function before comparing/keying sidesteps that without
// touching global rendering (turning off smartypants would also flatten
// em dashes and quotes throughout the visible body text).
export function normalizeAnchorText(s) {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}
