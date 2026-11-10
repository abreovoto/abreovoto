import { expect, test } from "vitest";
import { type ListFilter, matches, normalizeName } from "../src/lib/search";

const row = { nome: "Marília Arraes", status: "nao_declarou" as const, candidato: null, uf: "PE", partido: "SOLIDARIEDADE" };
const none = { status: "todos" as const, uf: "", partido: "", q: "" };

test("accent-insensitive, case-insensitive name search", () => {
  expect(normalizeName("José")).toBe("jose");
  expect(matches(row, { ...none, q: "marilia" })).toBe(true);
  expect(matches(row, { ...none, q: "ARRAES" })).toBe(true);
  expect(matches(row, { ...none, q: "silva" })).toBe(false);
});
test("filters compose and 'declarou' includes a vote shown in the session", () => {
  expect(matches(row, { ...none, uf: "PE", partido: "PL" })).toBe(false);
  expect(matches(row, { ...none, status: "declarou" })).toBe(false);
  expect(matches({ ...row, status: "mostrou_na_sessao", candidato: "marinho" }, { ...none, status: "declarou" })).toBe(true);
});

const levels = ["nao_declarou", "declarou", "mostrou_na_sessao", "apoio_mapeado", "partido"] as const;
const shown = (status: ListFilter["status"]) =>
  levels.filter((l) => matches({ ...row, status: l, candidato: l === "nao_declarou" ? null : "marinho" }, { ...none, status }));

test("'todos' shows every level", () => {
  expect(shown("todos")).toEqual([...levels]);
});

test("'nao_declarou' shows only senators with no known position", () => {
  expect(shown("nao_declarou")).toEqual(["nao_declarou"]);
});

test("'declarou' shows the senator's own word, a vote shown in the session included", () => {
  expect(shown("declarou")).toEqual(["declarou", "mostrou_na_sessao"]);
});

test("'apoio_mapeado' shows only mapped support", () => {
  expect(shown("apoio_mapeado")).toEqual(["apoio_mapeado"]);
});

test("'partido' shows only party or federation support", () => {
  expect(shown("partido")).toEqual(["partido"]);
});
