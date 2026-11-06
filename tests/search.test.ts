import { expect, test } from "vitest";
import { matches, normalizeName } from "../src/lib/search";

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
