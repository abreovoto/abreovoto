/**
 * The open-data export served at /dados.json: the petition, the scoreboard and every seat holder,
 * past and present, with keys in Portuguese like the files under data/.
 */
import type { Dataset } from "../data/load";
import { placar } from "../data/placar";
import { absolute, senatorPath } from "./routes";

export type OpenData = {
  gerado_em: string;
  eleicao: string;
  licenca: "CC BY 4.0";
  fonte: "https://github.com/abreovoto/abreovoto";
  peticao: { url: string | null; contagem_manual: number };
  placar: {
    total: number;
    nao_declararam: number;
    declararam: number;
    por_candidato: { id: string; nome: string; partido: string; uf: string; total: number }[];
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
      nao_declararam: p.naoDeclararam,
      declararam: p.declararam,
      por_candidato: p.porCandidato.map(({ id, nome, partido, uf, total }) => ({ id, nome, partido, uf, total })),
    },
    senadores: [...d.senadores]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((s) => {
        const decl = s.declaracao;
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
          pagina: absolute(senatorPath(s.id)),
        };
      }),
  };
}
