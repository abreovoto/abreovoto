import { expect, test } from "vitest";
import { loadData } from "../src/data/load";
import { openData } from "../src/lib/open-data";

test("the open data mirrors the scoreboard and lists every seat holder, past and present", () => {
  const d = loadData();
  const o = openData(d, "2026-11-06");
  expect(o.gerado_em).toBe("2026-11-06");
  expect(o.eleicao).toBe(d.site.eleicao);
  expect(o.licenca).toBe("CC BY 4.0");
  expect(o.fonte).toBe("https://github.com/abreovoto/abreovoto");
  expect(o.placar.total).toBe(81);
  expect(o.placar.nao_declararam + o.placar.declararam).toBe(81);
  expect(o.placar.por_candidato.map((c) => c.id)).toEqual(["alcolumbre", "marinho", "tereza-cristina"]);
  expect(o.senadores).toHaveLength(d.senadores.length);
  expect(o.senadores.filter((s) => s.situacao === "em_exercicio")).toHaveLength(81);
  expect(o.senadores.find((s) => s.id === "marcio-bittar")?.pagina).toBe("https://abreovoto.com/senador/marcio-bittar/");
  expect(o.senadores.find((s) => s.id === "marcio-bittar")?.declaracao).toEqual({ status: "nao_declarou", candidato: null, data: null, fonte: null });
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
  const s = d.senadores.find((x) => x.id === "marcio-bittar")!;
  s.declaracao = {
    status: "declarou",
    candidato: "marinho",
    data: "2026-11-05",
    fonte: { tipo: "video", url: "https://www.youtube.com/watch?v=x", titulo: null, trecho: "Voto nele." },
  };
  const o = openData(d, "2026-11-06");
  expect(o.senadores.find((x) => x.id === "marcio-bittar")?.declaracao).toEqual({
    status: "declarou",
    candidato: "marinho",
    data: "2026-11-05",
    fonte: { tipo: "video", url: "https://www.youtube.com/watch?v=x" },
  });
  expect(o.placar.declararam).toBe(1);
  expect(o.placar.por_candidato.find((c) => c.id === "marinho")?.total).toBe(1);
});

test("the open data names the repository the site itself points to", () => {
  const d = loadData();
  expect(openData(d, "2026-11-06").fonte).toBe(d.site.repositorio);
});
