import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { normalizeAnchorText } from "./normalize-anchor.mjs";

// Astro's content-layer store requires filePath to be relative to the site
// root (posix-separated) - an absolute path throws "File path must be
// relative to the site root" in astro/dist/content/mutable-data-store.js.
// That check only triggers on POSIX (an absolute path starts with "/"),
// which is why passing the absolute path here built fine on Windows but
// broke on Cloudflare's Linux build. Astro's own glob() loader does this
// same relative conversion before calling store.set() (see
// astro/dist/content/loaders/glob.js, posixRelative()).
function toSiteRootRelative(root, absoluteFilePath) {
  return path.relative(fileURLToPath(root), absoluteFilePath).split(path.sep).join("/");
}

// Custom Content Layer loader for Notes/*.md (the v2 "topic note + dated
// entries" model). The stock glob() loader can't be used here because a
// Notes/ file's body is really two documents glued together: a Turkish
// body followed by "---\n## English Version\n" and a full English
// translation. We need those rendered to HTML separately (one becomes
// entry.rendered for <Content />, the other becomes entry.data.enHtml) so
// the detail page can show one or the other based on the TR/EN toggle,
// instead of dumping both languages one after another.
//
// context.renderMarkdown() (Astro 5's Content Layer loader API) renders a
// markdown string through the project's actual configured pipeline
// (remark-gfm, the custom remarkWikilinks plugin, etc.) - the same
// pipeline the built-in glob() loader uses - so both halves stay visually
// consistent with the rest of the site.

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const EN_VERSION_RE = /\r?\n---\r?\n##\s+English Version\s*\r?\n/;

export function notesLoader({ base }) {
  return {
    name: "notes-loader",
    load: async (context) => {
      const { store, logger, renderMarkdown, parseData, generateDigest, watcher, config } = context;
      store.clear();

      const dir = base;
      if (!fs.existsSync(dir)) {
        logger.warn(`Notes directory not found: ${dir}`);
        return;
      }

      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

      async function loadOne(file) {
        const filePath = path.join(dir, file);
        const raw = fs.readFileSync(filePath, "utf8");

        const fmMatch = raw.match(FRONTMATTER_RE);
        if (!fmMatch) {
          logger.warn(`No frontmatter found in ${file}, skipping`);
          return;
        }

        let frontmatter;
        try {
          frontmatter = yaml.load(fmMatch[1]) ?? {};
        } catch (err) {
          logger.error(`YAML parse error in ${file}: ${err.message}`);
          return;
        }

        const rawBody = fmMatch[2];
        const sepMatch = rawBody.match(EN_VERSION_RE);
        const trBody = sepMatch ? rawBody.slice(0, sepMatch.index) : rawBody;
        const enBody = sepMatch ? rawBody.slice(sepMatch.index + sepMatch[0].length) : "";

        const id = file.replace(/\.md$/, "");
        const digest = generateDigest(raw);

        const parsedData = await parseData({ id, data: frontmatter, filePath });

        const renderedTr = await renderMarkdown(trBody);
        const renderedEn = enBody.trim() ? await renderMarkdown(enBody) : null;

        // Map each "## [Date] — [Label]" entry heading's literal text to
        // the actual id Astro's markdown pipeline generated for it, so
        // page-level code can link straight to /notes/<id>/#<headingId>
        // instead of re-implementing the slugger (and getting it wrong on
        // Turkish characters/em dashes/etc).
        const entryAnchorMap = {};
        for (const h of renderedTr.metadata?.headings ?? []) {
          if (h.depth === 2) entryAnchorMap[normalizeAnchorText(h.text)] = h.slug;
        }

        store.set({
          id,
          data: {
            ...parsedData,
            enHtml: renderedEn ? renderedEn.html : "",
            entryAnchorMap,
          },
          body: trBody,
          filePath: toSiteRootRelative(config.root, filePath),
          digest,
          rendered: renderedTr,
        });
      }

      await Promise.all(files.map(loadOne));

      if (!watcher) return;
      watcher.add(dir);
      const onChange = async (changedPath) => {
        if (!changedPath.endsWith(".md") || path.dirname(changedPath) !== dir) return;
        await loadOne(path.basename(changedPath));
        logger.info(`Reloaded ${path.basename(changedPath)}`);
      };
      watcher.on("change", onChange);
      watcher.on("add", onChange);
      watcher.on("unlink", (deletedPath) => {
        if (path.dirname(deletedPath) !== dir) return;
        store.delete(path.basename(deletedPath).replace(/\.md$/, ""));
      });
    },
  };
}
