import { expect, test } from "vitest";
import { PORTRAIT_RATIO, PORTRAIT_SIZES, requestedWidths, undersized } from "../src/lib/portrait";

test("sizes grow from list to share and the ratio is portrait", () => {
  expect(PORTRAIT_SIZES.list).toBeLessThan(PORTRAIT_SIZES.state);
  expect(PORTRAIT_SIZES.state).toBeLessThanOrEqual(PORTRAIT_SIZES.page);
  expect(PORTRAIT_RATIO).toBeLessThan(1);
});

test("requestedWidths never exceeds the source width", () => {
  expect(requestedWidths("list", 480)).toEqual([PORTRAIT_SIZES.list, 2 * PORTRAIT_SIZES.list]);
  expect(requestedWidths("page", 114).every((w) => w <= 114)).toBe(true);
  expect(requestedWidths("page", 114).length).toBeGreaterThan(0);
});

test("undersized lists the photos below 2x of the context", () => {
  const photos = [
    { id: "a", width: 480 },
    { id: "b", width: 114 },
    { id: "c", width: 2 * PORTRAIT_SIZES.page },
  ];
  expect(undersized(photos, "page")).toEqual(["b"]);
});
