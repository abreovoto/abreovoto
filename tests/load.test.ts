import { expect, test } from "vitest";
import { DataError, emExercicio, loadData } from "../src/data/load";
import { type DatasetOverrides, makeDataset, senadorEntry } from "./fixtures/make-dataset";

/** The issue lines a dataset produces; fails the test when loading succeeds. */
function issuesOf(overrides: DatasetOverrides, today?: string): string[] {
  try {
    loadData({ ...makeDataset(overrides), today });
  } catch (e) {
    if (e instanceof DataError) return e.issues;
    throw e;
  }
  throw new Error("expected loadData to throw a DataError");
}

test("valid fixture loads with 81 em exercicio and 3 candidates", () => {
  const d = loadData(makeDataset({}));
  expect(emExercicio(d)).toHaveLength(81);
  expect(d.candidatos).toHaveLength(3);
});

test("rejects duplicate ids", () => {
  const dup = { ...senadorEntry("ac-1", "AC", 1), situacao: "deixou_mandato", deixou_em: "2026-10-01", substituido_por: "ac-2" };
  expect(issuesOf({ extraSenadores: [dup] }).join("\n")).toMatch(/\[ac-1\].*repetido/);
});

test("rejects a UF with two occupants on the same vaga", () => {
  expect(() => loadData(makeDataset({ duplicateVaga: "RN" }))).toThrow(/RN.*vaga 1/);
});

test("rejects 82 em exercicio", () => {
  expect(() => loadData(makeDataset({ extraSeat: true }))).toThrow(/82/);
});

test("rejects a mandato that does not match the vaga", () => {
  expect(issuesOf({ senador: { "ap-1": { mandato: "2023-2031" } } }).join("\n")).toMatch(/\[ap-1\].*mandato/);
});

test("rejects a former occupant without a valid replacement", () => {
  const former = { ...senadorEntry("ac-1-antigo", "AC", 1), situacao: "deixou_mandato", deixou_em: "2026-10-01", substituido_por: "nao-existe" };
  expect(issuesOf({ extraSenadores: [former] }).join("\n")).toMatch(/\[ac-1-antigo\].*substituido_por/);
  expect(issuesOf({ senador: { "ac-1": { deixou_em: "2026-10-01" } } }).join("\n")).toMatch(/\[ac-1\].*deixou_em/);
});

test("accepts a seat that changed hands twice", () => {
  const first = { ...senadorEntry("ac-1-primeiro", "AC", 1), situacao: "deixou_mandato", deixou_em: "2026-09-01", substituido_por: "ac-1-segundo" };
  const second = { ...senadorEntry("ac-1-segundo", "AC", 1), situacao: "deixou_mandato", deixou_em: "2026-10-01", substituido_por: "ac-1" };
  expect(() => loadData(makeDataset({ extraSenadores: [first, second] }))).not.toThrow();
});

test("rejects a replacement on another seat", () => {
  const former = { ...senadorEntry("ac-1-antigo", "AC", 1), situacao: "deixou_mandato", deixou_em: "2026-10-01", substituido_por: "ac-2" };
  expect(issuesOf({ extraSenadores: [former] }).join("\n")).toMatch(/\[ac-1-antigo\].*AC vaga 2/);
});

test("rejects a chain of replacements that never reaches someone in office", () => {
  const a = { ...senadorEntry("ac-1-a", "AC", 1), situacao: "deixou_mandato", deixou_em: "2026-09-01", substituido_por: "ac-1-b" };
  const b = { ...senadorEntry("ac-1-b", "AC", 1), situacao: "deixou_mandato", deixou_em: "2026-10-01", substituido_por: "ac-1-a" };
  expect(issuesOf({ extraSenadores: [a, b] }).join("\n")).toMatch(/\[ac-1-a\].*não termina/);
});

test("rejects a declaration for a withdrawn candidate", () => {
  expect(() => loadData(makeDataset({ withdraw: "tereza-cristina", declareFor: ["ac-1", "tereza-cristina"] }))).toThrow(/desistiu/);
});

test("requires desistiu_em exactly when the candidate withdrew", () => {
  expect(issuesOf({ candidato: { marinho: { situacao: "desistiu" } } }).join("\n")).toMatch(/\[marinho\].*desistiu_em/);
  expect(issuesOf({ candidato: { marinho: { desistiu_em: "2026-10-15" } } }).join("\n")).toMatch(/\[marinho\].*desistiu_em/);
});

test("accepts a candidate's own seat that has not declared", () => {
  const nao = { status: "nao_declarou", candidato: null, data: null, fonte: null };
  const d = loadData(makeDataset({ senador: { "ms-3": { declaracao: nao } } }));
  expect(d.senadores.find((s) => s.id === "ms-3")?.declaracao.status).toBe("nao_declarou");
});

test("accepts a candidate's own seat that declared for another candidate", () => {
  const d = loadData(makeDataset({ declareFor: ["rn-3", "alcolumbre"] }));
  expect(d.senadores.find((s) => s.id === "rn-3")?.declaracao.candidato).toBe("alcolumbre");
});

test("rejects a candidate whose senador is not a known senator", () => {
  expect(issuesOf({ candidato: { marinho: { senador: "nao-existe" } } }).join("\n")).toMatch(/\[marinho\].*nao-existe/);
});

test("rejects a missing photo and names the id", () => {
  expect(() => loadData(makeDataset({ dropPhoto: "ac-1" }))).toThrow(/ac-1.*foto/);
});

test("rejects a senator with an empty historico", () => {
  expect(issuesOf({ senador: { "ac-1": { historico: [] } } }).join("\n")).toMatch(/\[ac-1\].*historico/);
});

test("rejects a negative manual count and an election date other than 2027-02-01", () => {
  expect(issuesOf({ peticao: { contagem_manual: -1 } }).join("\n")).toMatch(/peticao\.yaml.*contagem_manual/);
  expect(issuesOf({ site: { eleicao: "2027-02-02" } }).join("\n")).toMatch(/site\.yaml.*eleicao/);
});

test("rejects dates later than the given today", () => {
  expect(issuesOf({}, "2026-10-14").join("\n")).toMatch(/\[ap-3\].*declaracao\.data/);
});

test("collects every issue instead of stopping at the first", () => {
  const issues = issuesOf({ dropPhoto: "ac-1", duplicateVaga: "RN", peticao: { contagem_manual: -1 } });
  expect(issues.some((i) => /ac-1.*foto/.test(i))).toBe(true);
  expect(issues.some((i) => /RN vaga 1/.test(i))).toBe(true);
  expect(issues.some((i) => /peticao\.yaml/.test(i))).toBe(true);
});

test("rejects an unknown key in the YAML", () => {
  expect(() => loadData(makeDataset({ extraKey: true }))).toThrow(/unrecognized|desconhecid/i);
});
