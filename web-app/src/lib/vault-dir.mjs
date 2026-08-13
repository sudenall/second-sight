import path from "node:path";

/**
 * Resolves the directory that contains Sessions/, Concepts/,
 * Weekly-Summaries/ and _index/ (i.e. the second-sight-vault private
 * repo's root).
 *
 * Local dev: web-app/ lives inside the vault itself (both public and
 * private repos share this working tree), so the parent directory of
 * web-app/ already contains everything - no override needed.
 *
 * Cloudflare build: the public repo (this one) doesn't contain vault
 * content, so the build script clones second-sight-vault separately and
 * points VAULT_DATA_DIR at that clone. See README-DEPLOY.md.
 */
export function getVaultDataDir() {
  const fromEnv = process.env.VAULT_DATA_DIR;
  if (fromEnv && fromEnv.trim() !== "") return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "..");
}
