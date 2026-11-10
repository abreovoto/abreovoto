import { expect, test } from "vitest";
import { emExercicio, loadData } from "../src/data/load";
import { placar } from "../src/data/placar";

test("the real dataset loads and the scoreboard is consistent", () => {
  const d = loadData();
  const p = placar(d);
  expect(p.total).toBe(81);
  expect(p.semPosicao + p.comPosicao).toBe(81);
  expect(p.comPosicao).toBe(p.declararam + p.mapeados + p.partido);
  expect(p.porCandidato).toHaveLength(3);
  expect(p.porCandidato.reduce((n, c) => n + c.total, 0)).toBe(p.comPosicao);
});

test("the real dataset has no duplicate names among those in office", () => {
  const d = loadData();
  const names = emExercicio(d).map((s) => s.nome);
  expect(new Set(names).size).toBe(81);
});
