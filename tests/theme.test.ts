import { expect, test } from "vitest";
import { themeToggleLabel } from "../src/lib/theme";

test("the theme button names the theme it switches to", () => {
  expect(themeToggleLabel("dark")).toBe("Tema claro");
  expect(themeToggleLabel("light")).toBe("Tema escuro");
});
