import { expect, test } from "vitest";
import { ROWS, fillOrder, seats } from "../src/lib/hemicycle";

test("81 seats on four arcs, inside the box, inner row first", () => {
  const s = seats();
  expect(ROWS.reduce((a, b) => a + b, 0)).toBe(81);
  expect(s).toHaveLength(81);
  for (const p of s) {
    expect(p.x).toBeGreaterThanOrEqual(6);
    expect(p.x).toBeLessThanOrEqual(294);
    expect(p.y).toBeGreaterThanOrEqual(6);
    expect(p.y).toBeLessThanOrEqual(152);
  }
  expect(s[0]!.x).toBeLessThan(s[14]!.x); // the inner row runs left to right
});

test("declared seats fill from the centre of the arc outward", () => {
  const s = seats();
  const o = fillOrder();
  expect(new Set(o).size).toBe(81);
  const first = s[o[0]!]!;
  expect(Math.abs(first.x - 150)).toBeLessThan(12);
  const dist = (i: number) => Math.abs(s[i]!.x - 150);
  expect(dist(o[0]!)).toBeLessThanOrEqual(dist(o[80]!));
});
