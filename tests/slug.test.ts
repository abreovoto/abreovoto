import { expect, test } from "vitest";
import { slugify } from "../src/data/slug";

test("strips accents and spaces", () => {
  expect(slugify("Rogério Marinho")).toBe("rogerio-marinho");
});

test("handles Dr., parentheses and nicknames", () => {
  expect(slugify("Dr. Fernando Máximo")).toBe("dr-fernando-maximo");
  expect(slugify("Júlio César (Julim do Lula)")).toBe("julio-cesar-julim-do-lula");
});

test("is idempotent", () => {
  expect(slugify(slugify("Carol de Toni"))).toBe("carol-de-toni");
});
