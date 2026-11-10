import { type Dataset, emExercicio } from "./load";
import { posicao } from "./posicao";
import type { UF } from "./schema";

/** How a count splits by level. `declararam` is the senator's own word: `declarou` plus `mostrou_na_sessao`. */
export type PorNivel = { declararam: number; mapeados: number; partido: number };

export type PlacarCandidato = { id: string; nome: string; partido: string; uf: UF; total: number; porNivel: PorNivel };

export type Placar = {
  /** Senators currently in office. */
  total: number;
  /** No known position at any level. */
  semPosicao: number;
  /** Any level: `declararam + mapeados + partido`. */
  comPosicao: number;
  /** `declarou` plus `mostrou_na_sessao`: a ballot shown in the session is also a declaration. */
  declararam: number;
  mapeados: number;
  partido: number;
  /** Only `mostrou_na_sessao`. */
  mostraram: number;
  /** Active candidates, most support first (all levels summed), ties by name (pt-BR). */
  porCandidato: PlacarCandidato[];
};

const emptyLevels = (): PorNivel => ({ declararam: 0, mapeados: 0, partido: 0 });

/** Derive the scoreboard from the senators in office. Pure: reads nothing but `d`. */
export function placar(d: Dataset): Placar {
  const senadores = emExercicio(d);
  const porCandidatoNivel = new Map<string, PorNivel>();
  const all = emptyLevels();
  let mostraram = 0;
  for (const s of senadores) {
    const p = posicao(s, d);
    if (p.nivel === "nao_declarou") continue;
    if (p.nivel === "mostrou_na_sessao") mostraram++;
    const key: keyof PorNivel = p.nivel === "apoio_mapeado" ? "mapeados" : p.nivel === "partido" ? "partido" : "declararam";
    const levels = porCandidatoNivel.get(p.candidato) ?? emptyLevels();
    levels[key]++;
    all[key]++;
    porCandidatoNivel.set(p.candidato, levels);
  }
  const porCandidato = d.candidatos
    .filter((c) => c.situacao === "candidato")
    .map((c) => {
      const porNivel = porCandidatoNivel.get(c.id) ?? emptyLevels();
      const total = porNivel.declararam + porNivel.mapeados + porNivel.partido;
      return { id: c.id, nome: c.nome, partido: c.partido, uf: c.uf, total, porNivel };
    })
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  const comPosicao = all.declararam + all.mapeados + all.partido;
  return {
    total: senadores.length,
    semPosicao: senadores.length - comPosicao,
    comPosicao,
    ...all,
    mostraram,
    porCandidato,
  };
}
