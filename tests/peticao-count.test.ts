import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parseSignatureCount, peticaoAnswer } from "../worker/peticao-count";

const page = readFileSync("tests/fixtures/changeorg-fragment.html", "utf8");

test("the first signatureCount object that carries a total wins; objects without one are skipped", () => {
  expect(parseSignatureCount(page)).toBe(39);
  expect(parseSignatureCount('x "signatureCount":{"total":1204,"displayed":1200} y')).toBe(1204);
});

test.each(["", "<html></html>", '"signatureCount":{"minimum":100,"maximum":20000}', '"signatureCount":{"total":"39"}', '"signatureCount":{"total":-1}'])(
  "no usable total gives null: %s",
  (html) => expect(parseSignatureCount(html)).toBeNull(),
);

const stored = { url: "https://www.change.org/p/a", total: 812, atualizadoEm: "2026-11-10T12:00:00.000Z" };

test("the stored value is served only for the current petition; otherwise the manual figure", () => {
  expect(peticaoAnswer(stored, "https://www.change.org/p/a", 0)).toEqual({ total: 812, atualizadoEm: stored.atualizadoEm, origem: "changeorg" });
  expect(peticaoAnswer(stored, "https://www.change.org/p/b", 7)).toEqual({ total: 7, atualizadoEm: null, origem: "manual" });
  expect(peticaoAnswer(null, "https://www.change.org/p/a", 7)).toEqual({ total: 7, atualizadoEm: null, origem: "manual" });
  expect(peticaoAnswer(stored, null, 0)).toEqual({ total: 0, atualizadoEm: null, origem: "manual" });
});
