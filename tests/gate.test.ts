import { expect, test } from "vitest";
import { emExercicio, loadData } from "../src/data/load";
import { placar } from "../src/data/placar";

test("the real dataset loads and the scoreboard is consistent", () => {
  const d = loadData();
  const p = placar(d);
  expect(p.total).toBe(81);
  expect(p.naoDeclararam + p.declararam).toBe(81);
  expect(p.porCandidato).toHaveLength(3);
  expect(p.porCandidato.reduce((n, c) => n + c.total, 0)).toBe(p.declararam);
});

test("the real dataset has no duplicate names and every photo", () => {
  const d = loadData();
  const names = emExercicio(d).map((s) => s.nome);
  expect(new Set(names).size).toBe(81);
});
