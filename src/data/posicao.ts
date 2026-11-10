/**
 * A senator's effective position, derived from the stored declaration, a running
 * candidacy, the party announcements and the senator's opt-out. Nothing stores it.
 *
 * Precedence, highest first: `mostrou_na_sessao` > `declarou` > `apoio_mapeado`
 * (a running candidate for themselves, or stored) > party/caucus/federation > none.
 */
import { type Dataset, partidoVigente } from "./load";
import type { FonteTipo, PartidoApoio, RecusaPartido, Senador } from "./schema";

export type Nivel = "mostrou_na_sessao" | "declarou" | "apoio_mapeado" | "partido" | "nao_declarou";
export type Origem = "senador" | "candidatura" | "partido" | "bancada" | "federacao";
export type PosicaoFonte = { tipo: FonteTipo | "candidatura"; url: string; titulo: string | null; trecho: string | null };

/** `partido` is the party entry in effect even when another level wins or `recusa` blocks it. */
export type Posicao =
  | {
      nivel: "nao_declarou";
      candidato: null;
      data: null;
      fonte: null;
      origem: null;
      partido: PartidoApoio | null;
      recusa: RecusaPartido | null;
    }
  | {
      nivel: Exclude<Nivel, "nao_declarou">;
      candidato: string;
      data: string;
      fonte: PosicaoFonte;
      origem: Origem;
      partido: PartidoApoio | null;
      recusa: RecusaPartido | null;
    };

export function posicao(s: Senador, d: Dataset): Posicao {
  const partido = partidoVigente(d.partidos, s.partido);
  const recusa = s.recusa_partido ?? null;
  const decl = s.declaracao;

  if (decl.status === "mostrou_na_sessao" || decl.status === "declarou") {
    return { nivel: decl.status, candidato: decl.candidato, data: decl.data, fonte: decl.fonte, origem: "senador", partido, recusa };
  }

  const candidacy = d.candidatos.find((c) => c.senador === s.id && c.situacao === "candidato");
  if (candidacy) {
    return {
      nivel: "apoio_mapeado",
      candidato: candidacy.id,
      data: candidacy.desde,
      fonte: { tipo: "candidatura", url: candidacy.fonte, titulo: null, trecho: null },
      origem: "candidatura",
      partido,
      recusa,
    };
  }

  if (decl.status === "apoio_mapeado") {
    return { nivel: "apoio_mapeado", candidato: decl.candidato, data: decl.data, fonte: decl.fonte, origem: "senador", partido, recusa };
  }

  if (partido?.candidato && !recusa) {
    return {
      nivel: "partido",
      candidato: partido.candidato,
      data: partido.data,
      fonte: partido.fonte,
      origem: partido.escopo,
      partido,
      recusa,
    };
  }

  return { nivel: "nao_declarou", candidato: null, data: null, fonte: null, origem: null, partido, recusa };
}

/** `declarou` and `mostrou_na_sessao`: the senator's own word. */
export const proprioVoto = (p: Posicao): boolean => p.nivel === "declarou" || p.nivel === "mostrou_na_sessao";
