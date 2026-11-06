import { expect, test } from "vitest";
import { petitionView } from "../src/lib/petition";

const p = { url: "https://www.change.org/p/x", meta: 100000, contagem_manual: 0 };

test("no petition, no block", () => {
  expect(petitionView({ ...p, url: null }, 1200)).toBeNull();
});
test("the number only from 500", () => {
  expect(petitionView(p, 499)).toEqual({ url: p.url, showCount: false, count: 499 });
  expect(petitionView(p, 500)).toEqual({ url: p.url, showCount: true, count: 500 });
  expect(petitionView({ ...p, contagem_manual: 700 }, null)).toEqual({ url: p.url, showCount: true, count: 700 });
});
