import { type Dataset } from "../../src/data/load";
import { posicao } from "../../src/data/posicao";
import type { Senador } from "../../src/data/schema";

/** The not-declared state, set explicitly so a test does not depend on today's data. */
export const asUndeclared = (s: Senador): Senador => ({
  ...s,
  declaracao: { status: "nao_declarou", candidato: null, data: null, fonte: null },
});

/**
 * The dataset with no party, caucus or federation announcement, so a senator set to not
 * declared shows as not declared whatever the parties have announced by today.
 */
export const withoutPartySupport = (d: Dataset): Dataset => ({ ...d, partidos: [] });

/** A senator in office with no position at any level, not a candidate and with no X profile: the build tests' example. */
export function undeclaredSeat(d: Dataset): Senador {
  const s = [...d.senadores]
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((x) => x.situacao === "em_exercicio" && posicao(x, d).nivel === "nao_declarou" && x.redes.x === null);
  if (!s) throw new Error("no undeclared senator left to use as the example");
  return s;
}

/** A senator in office with no position at any level and an X profile: the example for the X call-out. */
export function undeclaredSeatWithX(d: Dataset): Senador & { handle: string } {
  const candidates = new Set(d.candidatos.map((c) => c.senador));
  const s = [...d.senadores]
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((x) => x.situacao === "em_exercicio" && posicao(x, d).nivel === "nao_declarou" && x.redes.x !== null && !candidates.has(x.id));
  if (!s) throw new Error("no undeclared senator with an X profile left to use as the example");
  return { ...s, handle: s.redes.x!.replace(/\/+$/, "").split("/").pop()! };
}
