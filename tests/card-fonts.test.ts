import { expect, test } from "vitest";
import { cardFonts } from "../src/lib/card-fonts";

test("the three static Archivo instances load, with the OFL beside them", () => {
  const fonts = cardFonts();
  expect(fonts.map((f) => [f.name, f.weight])).toEqual([["Display", 800], ["Text", 400], ["Text", 600]]);
  for (const f of fonts) {
    expect(f.data.length).toBeGreaterThan(50_000);
    expect(f.data.subarray(0, 4).toString("hex")).toBe("00010000"); // TrueType sfnt header
  }
});
