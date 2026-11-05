/**
 * Deterministic id from a display name: decompose accents (NFD), drop the
 * combining marks, lowercase, collapse every run of characters outside
 * [a-z0-9] into a single "-", and trim leading/trailing "-".
 */
export function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
