import { expect, test } from "vitest";
import { UF } from "../src/data/schema";
import { ufName, ufWithDe } from "../src/lib/uf";

test("the state's name takes the preposition Portuguese gives it", () => {
  expect(ufWithDe("SP")).toBe("de São Paulo");
  expect(ufWithDe("RN")).toBe("do Rio Grande do Norte");
  expect(ufWithDe("BA")).toBe("da Bahia");
  expect(ufWithDe("PB")).toBe("da Paraíba");
  expect(ufWithDe("MT")).toBe("de Mato Grosso");
  for (const uf of UF.options) expect(ufWithDe(uf)).toMatch(new RegExp(`^d[eoa] ${ufName(uf)}$`));
});
