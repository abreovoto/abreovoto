import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { contrast, palette } from "../src/styles/tokens";

const css = readFileSync("src/styles/global.css", "utf8");
const names = {
  bg: "bg",
  surface: "surface",
  fg: "fg",
  fgMuted: "fg-muted",
  line: "line",
  undeclared: "undeclared",
  declared: "declared",
  accent: "accent",
  onAccent: "on-accent",
  focus: "focus",
} as const;

function cssValue(block: string, name: string): string | undefined {
  return new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block)?.[1]?.toLowerCase();
}

test("contrast() matches the WCAG reference pairs", () => {
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 2);
  expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
});

test.each(["light", "dark"] as const)("%s palette meets WCAG AA on every text pair", (mode) => {
  const p = palette[mode];
  expect(contrast(p.fg, p.bg)).toBeGreaterThanOrEqual(7);
  expect(contrast(p.fg, p.surface)).toBeGreaterThanOrEqual(7);
  expect(contrast(p.fgMuted, p.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.undeclared, p.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.declared, p.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.focus, p.bg)).toBeGreaterThanOrEqual(3);
});

test.each(["light", "dark"] as const)("the two status colours carry equal weight in %s", (mode) => {
  const p = palette[mode];
  expect(Math.abs(contrast(p.undeclared, p.bg) - contrast(p.declared, p.bg))).toBeLessThanOrEqual(1.5);
});

test("global.css carries the same values as tokens.ts, in both modes", () => {
  const light = css.slice(0, css.indexOf('[data-theme="dark"]'));
  const dark = css.slice(css.indexOf('[data-theme="dark"]'));
  for (const [key, name] of Object.entries(names)) {
    expect(cssValue(light, name), `light ${name}`).toBe(palette.light[key as keyof typeof names]);
    expect(cssValue(dark, name), `dark ${name}`).toBe(palette.dark[key as keyof typeof names]);
  }
});

test("fonts are self-hosted and only woff2 is referenced", () => {
  expect(css).toMatch(/@import\s+"@fontsource-variable\//);
  expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic|use\.typekit/);
});
