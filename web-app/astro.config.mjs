import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import { getVaultDataDir } from "./src/lib/vault-dir.mjs";
import { buildWikilinkResolver, remarkWikilinks } from "./src/lib/wikilinks.mjs";

const vaultDir = getVaultDataDir();
const resolveWikilink = buildWikilinkResolver(vaultDir);

// Second Sight web app - fully static build, no SSR/adapter needed.
// Cloudflare Pages just serves the `dist/` output directory.
export default defineConfig({
  output: "static",
  integrations: [tailwind({ applyBaseStyles: false })],
  markdown: {
    remarkPlugins: [() => remarkWikilinks(resolveWikilink)],
  },
});
