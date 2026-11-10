/**
 * The open-data export served at /dados.json: the petition, the scoreboard and every seat holder,
 * past and present, with keys in Portuguese like the files under data/.
 */
import type { Dataset } from "../data/load";
import { placar } from "../data/placar";
import { posicao } from "../data/posicao";
import { absolute, senatorPath } from "./routes";

export type OpenData = {
  gerado_em: string;
  eleicao: string;
  licenca: "CC BY 4.0";
  fonte: "https://github.com/abreovoto/abreovoto";
  peticao: { url: string | null; contagem_manual: number };
  placar: {
    total: number;
    /** No known position at any level. */
    sem_posicao: number;
    /** Any level: `declararam + apoio_mapeado + pelo_partido`. */
    com_posicao: number;
    /** The senator's own word: `declarou` plus `mostrou_na_sessao`. */
    declararam: number;
    apoio_mapeado: number;
    pelo_partido: number;
    /** `total - declararam`, as before the levels existed. */
    nao_declararam: number;
    por_candidato: {
      id: string;
      nome: string;
      partido: string;
      uf: string;
      total: number;
      declararam: number;
      apoio_mapeado: number;
      pelo_partido: number;
    }[];
  };
  senadores: {
    id: string;
    nome: string;
    partido: string;
    uf: string;
    vaga: 1 | 2 | 3;
    situacao: "em_exercicio" | "deixou_mandato";
    assume_em: string | null;
    deixou_em: string | null;
    declaracao: {
      status: string;
      candidato: string | null;
      data: string | null;
      fonte: { tipo: string; url: string } | null;
    };
    /** The position in effect, derived from the declaration, a candidacy and the party's announcement. */
    posicao: {
      nivel: string;
      candidato: string | null;
      data: string | null;
      origem: string | null;
      fonte: { tipo: string; url: string } | null;
    };
    pagina: string;
  }[];
};

/** Pure: the same data and date always give the same file. */
export function openData(d: Dataset, today: string): OpenData {
  const p = placar(d);
  return {
    gerado_em: today,
    eleicao: d.site.eleicao,
    licenca: "CC BY 4.0",
    fonte: "https://github.com/abreovoto/abreovoto",
    peticao: { url: d.peticao.url, contagem_manual: d.peticao.contagem_manual },
    placar: {
      total: p.total,
      sem_posicao: p.semPosicao,
      com_posicao: p.comPosicao,
      declararam: p.declararam,
      apoio_mapeado: p.mapeados,
      pelo_partido: p.partido,
      nao_declararam: p.total - p.declararam,
      por_candidato: p.porCandidato.map(({ id, nome, partido, uf, total, porNivel }) => ({
        id,
        nome,
        partido,
        uf,
        total,
        declararam: porNivel.declararam,
        apoio_mapeado: porNivel.mapeados,
        pelo_partido: porNivel.partido,
      })),
    },
    senadores: [...d.senadores]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((s) => {
        const decl = s.declaracao;
        const pos = posicao(s, d);
        return {
          id: s.id,
          nome: s.nome,
          partido: s.partido,
          uf: s.uf,
          vaga: s.vaga,
          situacao: s.situacao,
          assume_em: s.assume_em,
          deixou_em: s.deixou_em,
          declaracao:
            decl.status === "nao_declarou"
              ? { status: decl.status, candidato: null, data: null, fonte: null }
              : { status: decl.status, candidato: decl.candidato, data: decl.data, fonte: { tipo: decl.fonte.tipo, url: decl.fonte.url } },
          posicao: {
            nivel: pos.nivel,
            candidato: pos.candidato,
            data: pos.data,
            origem: pos.origem,
            fonte: pos.fonte === null ? null : { tipo: pos.fonte.tipo, url: pos.fonte.url },
          },
          pagina: absolute(senatorPath(s.id)),
        };
      }),
  };
}
