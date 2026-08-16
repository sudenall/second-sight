import fs from "node:fs";
import path from "node:path";
import { visit } from "unist-util-visit";

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function slugsIn(dir) {
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
  );
}

/**
 * Builds a target->href resolver by scanning Notes/ once. Unresolved
 * wikilink targets (e.g. pointing at _ogrenme-tercihlerim.md, which isn't
 * part of the public site) fall back to plain, non-linked text rather than
 * producing a dead link.
 */
export function buildWikilinkResolver(vaultDir) {
  const noteSlugs = slugsIn(path.join(vaultDir, "Notes"));

  return (rawTarget) => {
    const target = rawTarget.trim();
    if (noteSlugs.has(target)) return `/notes/${target}/`;
    return null;
  };
}

/** Remark plugin: converts Obsidian [[wikilink]] / [[wikilink|alias]] text into real links. */
export function remarkWikilinks(resolve) {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      const value = node.value;
      if (!value.includes("[[")) return;

      const newNodes = [];
      let lastIndex = 0;
      let match;
      WIKILINK_RE.lastIndex = 0;
      while ((match = WIKILINK_RE.exec(value)) !== null) {
        const [full, target, alias] = match;
        if (match.index > lastIndex) {
          newNodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
        }
        const label = (alias ?? target).trim();
        const href = resolve(target);
        if (href) {
          newNodes.push({
            type: "link",
            url: href,
            children: [{ type: "text", value: label }],
          });
        } else {
          newNodes.push({ type: "text", value: label });
        }
        lastIndex = match.index + full.length;
      }
      if (lastIndex < value.length) {
        newNodes.push({ type: "text", value: value.slice(lastIndex) });
      }
      if (newNodes.length) {
        parent.children.splice(index, 1, ...newNodes);
        return index + newNodes.length;
      }
    });
  };
}
