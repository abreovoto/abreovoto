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
