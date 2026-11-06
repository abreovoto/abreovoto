import { expect, test } from "vitest";
import { loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
import { makeDataset } from "./fixtures/make-dataset";

test("valid fixture: 78 not declared, 3 declared, one per candidate", () => {
  const p = placar(loadData(makeDataset({})));
  expect(p).toMatchObject({ total: 81, naoDeclararam: 78, declararam: 3, mostraram: 0 });
  expect(p.porCandidato.map((c) => c.total)).toEqual([1, 1, 1]);
  expect(p.porCandidato.map((c) => c.nome)).toEqual(["Davi Alcolumbre", "Rogério Marinho", "Tereza Cristina"]);
});

test("orders by total desc then name", () => {
  const p = placar(loadData(makeDataset({ declareFor: [["ac-1", "tereza-cristina"], ["ac-2", "tereza-cristina"]] })));
  expect(p.porCandidato[0].id).toBe("tereza-cristina");
  expect(p.porCandidato[0].total).toBe(3);
  expect(p.porCandidato.map((c) => c.id)).toEqual(["tereza-cristina", "alcolumbre", "marinho"]);
});

test("a former occupant does not count", () => {
  const p = placar(loadData(makeDataset({ replace: ["ac-1", "ac-1-suplente"] })));
  expect(p.total).toBe(81);
});

test("a former occupant's declaration does not count", () => {
  const p = placar(loadData(makeDataset({ declareFor: ["ac-1", "marinho"], replace: ["ac-1", "ac-1-suplente"] })));
  expect(p).toMatchObject({ total: 81, naoDeclararam: 78, declararam: 3 });
  expect(p.porCandidato.find((c) => c.id === "marinho")?.total).toBe(1);
});

test("mostrou_na_sessao counts as declared and as shown", () => {
  const p = placar(loadData(makeDataset({ shown: ["ac-1", "marinho"] })));
  expect(p.declararam).toBe(4);
  expect(p.mostraram).toBe(1);
  expect(p.naoDeclararam).toBe(77);
  expect(p.porCandidato[0]).toMatchObject({ id: "marinho", total: 2 });
});

test("porCandidato carries nome, partido and uf from the candidates file", () => {
  const p = placar(loadData(makeDataset({})));
  expect(p.porCandidato[0]).toEqual({ id: "alcolumbre", nome: "Davi Alcolumbre", partido: "UNIÃO", uf: "AP", total: 1 });
});

test("a withdrawn candidate is not listed", () => {
  const p = placar(
    loadData(makeDataset({ withdraw: "marinho", senador: { "rn-3": { declaracao: { status: "nao_declarou", candidato: null, data: null, fonte: null } } } })),
  );
  expect(p.porCandidato.map((c) => c.id)).toEqual(["alcolumbre", "tereza-cristina"]);
  expect(p.declararam).toBe(2);
});
