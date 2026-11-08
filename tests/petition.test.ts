import { expect, test } from "vitest";
import { applyLiveTotal, formatCount, petitionView } from "../src/lib/petition";

const p = { url: "https://www.change.org/p/x", meta: 100000, contagem_manual: 0 };

test("no petition, no block", () => {
  expect(petitionView({ ...p, url: null }, 1200)).toBeNull();
});
test("the number only from 500", () => {
  expect(petitionView(p, 499)).toEqual({ url: p.url, showCount: false, count: 499 });
  expect(petitionView(p, 500)).toEqual({ url: p.url, showCount: true, count: 500 });
  expect(petitionView({ ...p, contagem_manual: 700 }, null)).toEqual({ url: p.url, showCount: true, count: 700 });
});

test("the count is formatted for Brazil", () => {
  expect(formatCount(1204)).toBe("1.204");
  expect(formatCount(500)).toBe("500");
});

function el(hidden: boolean, text = "0") {
  const span = { textContent: text };
  return { dataset: { floor: "500" } as DOMStringMap, hidden, querySelector: () => span as unknown as Element, span };
}

test("a live total at or above the floor shows and fills the count; below it, or junk, changes nothing", () => {
  const a = el(true);
  expect(applyLiveTotal(a, 812)).toBe(true);
  expect(a.hidden).toBe(false);
  expect(a.span.textContent).toBe("812");
  for (const junk of [499, 0, -3, 1.5, "812", null, undefined, {}]) {
    const b = el(true, "x");
    expect(applyLiveTotal(b, junk)).toBe(false);
    expect(b.hidden).toBe(true);
    expect(b.span.textContent).toBe("x");
  }
});
