import type { Peticao } from "../data/schema";

/** The petition count is only printed from this number on: a small one argues against the petition. */
export const PETITION_COUNT_FLOOR = 500;

export type PetitionView = { url: string; showCount: boolean; count: number };

/**
 * What the home shows of the petition: nothing while it has no address; the
 * button alone while the count is small; the count once it reaches the floor.
 * `count` is the live figure when there is one, otherwise the manual one.
 */
export function petitionView(p: Peticao, count: number | null): PetitionView | null {
  if (p.url === null) return null;
  const n = count ?? p.contagem_manual;
  return { url: p.url, showCount: n >= PETITION_COUNT_FLOOR, count: n };
}

/** The route the home reads the live count from; same origin, so the page asks no third party. */
export const PETITION_API = "/api/peticao";

const ptBR = new Intl.NumberFormat("pt-BR");

export const formatCount = (n: number): string => ptBR.format(n);

type CountElement = { dataset: DOMStringMap; hidden: HTMLElement["hidden"]; querySelector(selector: string): Element | null };

/**
 * Shows the live total in the count element when it is an integer at or above the floor, and
 * says so. Anything else (a small count, junk from the route) leaves the page as it was built.
 */
export function applyLiveTotal(el: CountElement, total: unknown): boolean {
  const floor = Number(el.dataset.floor ?? PETITION_COUNT_FLOOR);
  if (typeof total !== "number" || !Number.isInteger(total) || total < floor) return false;
  const span = el.querySelector("[data-petition-count]");
  if (span) span.textContent = formatCount(total);
  el.hidden = false;
  return true;
}
