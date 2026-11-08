/**
 * The petition counter's pure parts: reading the total out of the petition page, and choosing
 * what /api/peticao answers. The stored value names the petition it was read from, because a
 * test run or a petition that was later replaced must never be shown as the initiative's count.
 */

export type PeticaoStored = { url: string; total: number; atualizadoEm: string };

export type PeticaoAnswer = { total: number; atualizadoEm: string | null; origem: "changeorg" | "manual" };

/** The KV key holding the last total read. */
export const KV_KEY = "peticao";

/** The petition site refuses requests without a browser user agent; the same one the portrait script uses. */
export const PETITION_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const SIGNATURE_COUNT = /"signatureCount":(\{[^{}]*\})/g;

/**
 * The page carries several signatureCount objects, some of them without a total (the goal
 * range, for one). The first that carries a non-negative integer total is the count.
 */
export function parseSignatureCount(html: string): number | null {
  for (const match of html.matchAll(SIGNATURE_COUNT)) {
    let value: unknown;
    try {
      value = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const total = (value as { total?: unknown }).total;
    if (typeof total === "number" && Number.isInteger(total) && total >= 0) return total;
  }
  return null;
}

/** The stored total when it was read from the current petition; the manual figure otherwise. */
export function peticaoAnswer(stored: PeticaoStored | null, currentUrl: string | null, manual: number): PeticaoAnswer {
  if (stored !== null && currentUrl !== null && stored.url === currentUrl) {
    return { total: stored.total, atualizadoEm: stored.atualizadoEm, origem: "changeorg" };
  }
  return { total: manual, atualizadoEm: null, origem: "manual" };
}
