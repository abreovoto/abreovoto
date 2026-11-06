import { type Dataset, emExercicio } from "./load";
import type { UF } from "./schema";

export type PlacarCandidato = { id: string; nome: string; partido: string; uf: UF; total: number };

export type Placar = {
  /** Senators currently in office. */
  total: number;
  naoDeclararam: number;
  /** `declarou` plus `mostrou_na_sessao`: a ballot shown in the session is also a declaration. */
  declararam: number;
  /** Only `mostrou_na_sessao`. */
  mostraram: number;
  /** Active candidates, most declarations first, ties by name (pt-BR). */
  porCandidato: PlacarCandidato[];
};

/** Derive the scoreboard from the senators in office. Pure: reads nothing but `d`. */
export function placar(d: Dataset): Placar {
  const senadores = emExercicio(d);
  const votos = new Map<string, number>();
  let naoDeclararam = 0;
  let mostraram = 0;
  for (const s of senadores) {
    const decl = s.declaracao;
    if (decl.status === "nao_declarou") {
      naoDeclararam++;
      continue;
    }
    if (decl.status === "mostrou_na_sessao") mostraram++;
    votos.set(decl.candidato, (votos.get(decl.candidato) ?? 0) + 1);
  }
  const porCandidato = d.candidatos
    .filter((c) => c.situacao === "candidato")
    .map((c) => ({ id: c.id, nome: c.nome, partido: c.partido, uf: c.uf, total: votos.get(c.id) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    total: senadores.length,
    naoDeclararam,
    declararam: senadores.length - naoDeclararam,
    mostraram,
    porCandidato,
  };
}
