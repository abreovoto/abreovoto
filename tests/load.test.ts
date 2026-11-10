import { expect, test } from "vitest";
import { DataError, emExercicio, loadData } from "../src/data/load";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { type DatasetOverrides, declarou, makeDataset, partidoEntry, senadorEntry } from "./fixtures/make-dataset";

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

test("accepts a swap scheduled for a future date, the successor already listed", () => {
  const d = loadData({
    ...makeDataset({ replace: ["mg-3", "mg-3-suplente"], senador: { "mg-3": { deixou_em: "2027-01-06" }, "mg-3-suplente": { assume_em: "2027-01-06" } } }),
    today: "2026-11-06",
  });
  expect(d.senadores.find((s) => s.id === "mg-3-suplente")?.assume_em).toBe("2027-01-06");
});

test("rejects a future departure the successor does not take up on the same date", () => {
  const issues = issuesOf({ replace: ["mg-3", "mg-3-suplente"], senador: { "mg-3": { deixou_em: "2027-01-06" } } }, "2026-11-06");
  expect(issues.join("\n")).toMatch(/\[mg-3\].*deixou_em 2027-01-06/);
});

test("rejects assume_em on someone who replaces nobody on that date", () => {
  expect(issuesOf({ senador: { "ac-1": { assume_em: "2027-01-06" } } }, "2026-11-06").join("\n")).toMatch(/\[ac-1\].*assume_em/);
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

test("rejects a candidate whose party or UF differs from their senator entry", () => {
  expect(issuesOf({ candidato: { marinho: { partido: "PT" } } }).join("\n")).toMatch(/\[marinho\].*partido/);
  expect(issuesOf({ candidato: { marinho: { uf: "SP" } } }).join("\n")).toMatch(/\[marinho\].*uf/);
});

test("rejects a photo without a credit", () => {
  expect(issuesOf({ senador: { "ac-1": { foto_credito: null } } }).join("\n")).toMatch(/\[ac-1\].*foto_credito/);
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

test("history events and observations are sentences, not log lines", () => {
  const d = loadData();
  for (const s of d.senadores) {
    for (const h of s.historico) expect(h.evento, `${s.id} historico`).not.toMatch(/_|\d{4}-\d{2}-\d{2}/);
    for (const o of s.observacoes) expect(o.texto, `${s.id} observação`).not.toMatch(/_|\d{4}-\d{2}-\d{2}/);
  }
  expect(d.senadores.every((s) => s.historico[0]?.evento === "entrou na lista como não declarou")).toBe(true);
});

test("the loader refuses a raw history event or an ISO date in an observation", () => {
  const raw = { historico: [{ data: "2026-11-05", evento: "criado como nao_declarou", issue: null }] };
  expect(issuesOf({ senador: { "ac-1": raw } }).join("\n")).toMatch(/\[ac-1\].*texto não legível em historico\.0\.evento: "criado como nao_declarou"/);
  const iso = { observacoes: [{ data: "2026-11-05", texto: "Em exercício desde 2026-05-06.", fonte_url: "https://example.org/x" }] };
  expect(issuesOf({ senador: { "ac-2": iso } }).join("\n")).toMatch(/\[ac-2\].*texto não legível em observacoes\.0\.texto/);
});

test("the fixture's history reads as a sentence", () => {
  expect(() => loadData(makeDataset({}))).not.toThrow();
});

const nao = { status: "nao_declarou", candidato: null, data: null, fonte: null };

test("partidos.yaml: an entry for a party no senator in office belongs to is rejected", () => {
  const entry = partidoEntry("XYZ", "marinho");
  expect(issuesOf({ partidos: [entry] })).toContain(`partidos.yaml [${entry.id}]: partido "XYZ" não tem senadores em exercício`);
});

test("partidos.yaml: a candidate not in candidatos.yaml is rejected", () => {
  expect(issuesOf({ partidos: [partidoEntry("PL", "nao-existe")] }).join("\n")).toMatch(/partidos\.yaml \[pl-2026-10-15\]: .*"nao-existe" não está em candidatos\.yaml/);
});

test("partidos.yaml: the entry in effect may not point at a withdrawn candidate", () => {
  const issues = issuesOf({ withdraw: "marinho", senador: { "rn-3": { declaracao: nao } }, partidos: [partidoEntry("PL", "marinho")] });
  expect(issues.join("\n")).toMatch(/partidos\.yaml \[pl-2026-10-15\]: .*desistiu/);
});

test("partidos.yaml: a superseded entry for a withdrawn candidate is history and loads", () => {
  const partidos = [partidoEntry("PL", "marinho", "2026-10-01"), partidoEntry("PL", null, "2026-10-10")];
  const d = loadData(makeDataset({ withdraw: "marinho", senador: { "rn-3": { declaracao: nao } }, partidos }));
  expect(d.partidos).toHaveLength(2);
});

test("partidos.yaml: two entries for the same party on the same date are rejected", () => {
  const second = { ...partidoEntry("PL", null), id: "pl-outra" };
  expect(issuesOf({ partidos: [partidoEntry("PL", "marinho"), second] }).join("\n")).toMatch(/partidos\.yaml .*PL.*2026-10-15/);
});

test("partidos.yaml: duplicate ids are rejected", () => {
  const entry = partidoEntry("PL", "marinho", "2026-10-01");
  const dup = { ...partidoEntry("PL", null, "2026-10-10"), id: entry.id };
  expect(issuesOf({ partidos: [entry, dup] }).join("\n")).toMatch(/partidos\.yaml \[pl-2026-10-01\]: id repetido/);
});

test("a missing partidos.yaml is reported", () => {
  const paths = makeDataset({});
  rmSync(join(paths.dir, "partidos.yaml"));
  try {
    loadData(paths);
    throw new Error("expected loadData to throw a DataError");
  } catch (e) {
    expect((e as DataError).issues.join("\n")).toMatch(/partidos\.yaml: arquivo não encontrado/);
  }
});

test("partidos.yaml: dates are not later than today", () => {
  expect(() => loadData({ ...makeDataset({ partidos: [partidoEntry("PL", "marinho")] }), today: "2026-10-15" })).not.toThrow();
  const issues = issuesOf({ partidos: [partidoEntry("PL", "marinho", "2026-10-14")] }, "2026-10-13");
  expect(issues.join("\n")).toMatch(/partidos\.yaml \[pl-2026-10-14\]: data 2026-10-14 é posterior/);
});

test("a running candidate's seat may not store apoio_mapeado", () => {
  const mapped = { ...declarou("marinho"), status: "apoio_mapeado" };
  expect(issuesOf({ senador: { "rn-3": { declaracao: mapped } } }).join("\n")).toMatch(/\[rn-3\].*candidato em campanha/);
});

test("apoio_mapeado loads on any other seat", () => {
  const d = loadData(makeDataset({ senador: { "ac-1": { declaracao: { ...declarou("marinho"), status: "apoio_mapeado" } } } }));
  expect(d.senadores.find((s) => s.id === "ac-1")?.declaracao.status).toBe("apoio_mapeado");
});

test("recusa_partido loads when present and is optional", () => {
  const recusa = { partido: "PARTIDO", data: "2026-10-12", trecho: "ainda não decidi", fonte_url: "https://www12.senado.leg.br/noticias/x" };
  const d = loadData(makeDataset({ senador: { "ac-1": { recusa_partido: recusa } } }));
  expect(d.senadores.find((s) => s.id === "ac-1")?.recusa_partido).toEqual(recusa);
  expect(d.senadores.find((s) => s.id === "ac-2")?.recusa_partido).toBeUndefined();
  expect(issuesOf({ senador: { "ac-1": { recusa_partido: { ...recusa, fonte_url: "http://x.org" } } } }).join("\n")).toMatch(/\[ac-1\].*recusa_partido/);
  const { partido: _, ...noParty } = recusa;
  expect(issuesOf({ senador: { "ac-1": { recusa_partido: noParty } } }).join("\n")).toMatch(/\[ac-1\].*recusa_partido\.partido/);
});
