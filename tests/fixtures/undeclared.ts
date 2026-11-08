import type { Candidato, Senador } from "../../src/data/schema";

/** The not-declared state, set explicitly so a test does not depend on today's data. */
export const asUndeclared = (s: Senador): Senador => ({
  ...s,
  declaracao: { status: "nao_declarou", candidato: null, data: null, fonte: null },
});

/** A senator in office who has not declared, is not a candidate and has no X profile: the build tests' example. */
export function undeclaredSeat(senadores: Senador[], candidatos: Candidato[]): Senador {
  const candidates = new Set(candidatos.map((c) => c.senador));
  const s = [...senadores]
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((x) => x.situacao === "em_exercicio" && x.declaracao.status === "nao_declarou" && x.redes.x === null && !candidates.has(x.id));
  if (!s) throw new Error("no undeclared senator left to use as the example");
  return s;
}
