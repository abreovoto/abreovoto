import { expect, test } from "vitest";
import { loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
import { openData } from "../src/lib/open-data";
import { undeclaredSeat } from "./fixtures/undeclared";

test("the open data mirrors the scoreboard and lists every seat holder, past and present", () => {
  const d = loadData();
  const o = openData(d, "2026-11-06");
  expect(o.gerado_em).toBe("2026-11-06");
  expect(o.eleicao).toBe(d.site.eleicao);
  expect(o.licenca).toBe("CC BY 4.0");
  expect(o.fonte).toBe("https://github.com/abreovoto/abreovoto");
  expect(o.placar.total).toBe(81);
  expect(o.placar.nao_declararam + o.placar.declararam).toBe(81);
  expect(o.placar.sem_posicao + o.placar.com_posicao).toBe(81);
  expect(o.placar.com_posicao).toBe(o.placar.declararam + o.placar.apoio_mapeado + o.placar.pelo_partido);
  for (const c of o.placar.por_candidato) expect(c.total).toBe(c.declararam + c.apoio_mapeado + c.pelo_partido);
  expect(o.placar.por_candidato.map((c) => c.id)).toEqual(placar(d).porCandidato.map((c) => c.id));
  expect(o.senadores).toHaveLength(d.senadores.length);
  expect(o.senadores.filter((s) => s.situacao === "em_exercicio")).toHaveLength(81);
  expect(o.senadores.find((s) => s.id === "marcio-bittar")?.pagina).toBe("https://abreovoto.com/senador/marcio-bittar/");
  const u = undeclaredSeat(d.senadores, d.candidatos);
  expect(o.senadores.find((s) => s.id === u.id)?.declaracao).toEqual({ status: "nao_declarou", candidato: null, data: null, fonte: null });
  expect(o.senadores.find((s) => s.id === u.id)?.posicao).toEqual({ nivel: "nao_declarou", candidato: null, data: null, origem: null, fonte: null });
  const names = o.senadores.map((s) => s.nome);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
});

test("a departed senator is in the file, outside the scoreboard", () => {
  const o = openData(loadData(), "2026-11-06");
  const dino = o.senadores.find((s) => s.id === "flavio-dino");
  expect(dino).toMatchObject({ situacao: "deixou_mandato", deixou_em: "2024-02-20" });
  expect(o.senadores.find((s) => s.id === "alex-diniz")?.assume_em).toBe("2027-01-06");
});

test("a declaration carries its candidate, date and source", () => {
  const d = loadData();
  const before = placar(d);
  const marinho = (p: ReturnType<typeof placar>) => p.porCandidato.find((c) => c.id === "marinho")!.total;
  const s = undeclaredSeat(d.senadores, d.candidatos);
  s.declaracao = {
    status: "declarou",
    candidato: "marinho",
    data: "2026-11-05",
    fonte: { tipo: "video", url: "https://www.youtube.com/watch?v=x", titulo: null, trecho: "Voto nele." },
  };
  const o = openData(d, "2026-11-06");
  expect(o.senadores.find((x) => x.id === s.id)?.declaracao).toEqual({
    status: "declarou",
    candidato: "marinho",
    data: "2026-11-05",
    fonte: { tipo: "video", url: "https://www.youtube.com/watch?v=x" },
  });
  expect(o.senadores.find((x) => x.id === s.id)?.posicao).toEqual({
    nivel: "declarou",
    candidato: "marinho",
    data: "2026-11-05",
    origem: "senador",
    fonte: { tipo: "video", url: "https://www.youtube.com/watch?v=x" },
  });
  expect(o.placar.declararam).toBe(before.declararam + 1);
  expect(o.placar.por_candidato.find((c) => c.id === "marinho")?.total).toBe(marinho(before) + 1);
});

test("the open data names the repository the site itself points to", () => {
  const d = loadData();
  expect(openData(d, "2026-11-06").fonte).toBe(d.site.repositorio);
});

test("the open data carries the petition's address and its manual figure", () => {
  const d = loadData();
  expect(openData(d, "2026-11-06").peticao).toEqual({ url: d.peticao.url, contagem_manual: d.peticao.contagem_manual });
});

test("party support is in the senator's position and the scoreboard's per-level counts", () => {
  const d = loadData();
  const s = undeclaredSeat(d.senadores, d.candidatos);
  const before = openData(d, "2026-11-06").placar;
  d.partidos = [
    {
      id: "partido-teste",
      partido: s.partido,
      escopo: "federacao",
      candidato: "marinho",
      data: "2026-11-05",
      fonte: { tipo: "nota", url: "https://example.org/nota", titulo: null, trecho: "apoio" },
    },
  ];
  const o = openData(d, "2026-11-06");
  expect(o.senadores.find((x) => x.id === s.id)?.posicao).toEqual({
    nivel: "partido",
    candidato: "marinho",
    data: "2026-11-05",
    origem: "federacao",
    fonte: { tipo: "nota", url: "https://example.org/nota" },
  });
  expect(o.senadores.find((x) => x.id === s.id)?.declaracao.status).toBe("nao_declarou");
  expect(o.placar.pelo_partido).toBeGreaterThan(before.pelo_partido);
  expect(o.placar.declararam).toBe(before.declararam);
  expect(o.placar.nao_declararam).toBe(before.nao_declararam);
});

test("a running candidate's position cites the candidacy", () => {
  const d = loadData();
  const c = d.candidatos.find((x) => x.situacao === "candidato")!;
  const seat = d.senadores.find((x) => x.id === c.senador)!;
  seat.declaracao = { status: "nao_declarou", candidato: null, data: null, fonte: null };
  const o = openData(d, "2026-11-06");
  expect(o.senadores.find((x) => x.id === seat.id)?.posicao).toEqual({
    nivel: "apoio_mapeado",
    candidato: c.id,
    data: c.desde,
    origem: "candidatura",
    fonte: { tipo: "candidatura", url: c.fonte },
  });
});
