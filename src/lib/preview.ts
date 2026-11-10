/**
 * Where a build is served. Production is abreovoto.com; a pull request's branch is built by
 * Workers Builds and served at its preview address, and its pages then name that address in
 * their share tags, so a preview's card can be checked on the networks without touching the
 * cards cached for production.
 */
export const PRODUCTION_URL = "https://abreovoto.com";

const WORKER = "abreovoto";
const ACCOUNT_SUBDOMAIN = "abreovoto";
const PRODUCTION_BRANCH = "main";

/**
 * The preview address Workers Builds gives a branch, `<branch>-<worker>.<subdomain>.workers.dev`,
 * or null for the production branch, for a build outside Workers Builds, and for a branch whose
 * address would not fit a DNS label (the platform's shortening is not documented, so it is not guessed).
 */
export function previewOrigin(branch: string | undefined): string | null {
  if (!branch || branch === PRODUCTION_BRANCH) return null;
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const label = `${slug}-${WORKER}`;
  if (!slug || label.length > 63) return null;
  return `https://${label}.${ACCOUNT_SUBDOMAIN}.workers.dev`;
}

/** The origin this build names in its absolute addresses. */
export const siteOrigin = (branch: string | undefined): string => previewOrigin(branch) ?? PRODUCTION_URL;
