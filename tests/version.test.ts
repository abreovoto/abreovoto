import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
const headings = readFileSync("CHANGELOG.md", "utf8")
  .split("\n")
  .filter((l) => l.startsWith("## "));

// Matched literally, brackets included, so 0.1.0 never matches a [0.1.0-rc.1] heading.
const heading = `## [${version}]`;
const hasHeading = headings.some((l) => l === heading || l.startsWith(`${heading} `));

test("the package version and the changelog agree", () => {
  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  // 0.0.0 is never released: a heading claiming it can only be a leftover or a typo.
  if (version === "0.0.0") expect(hasHeading).toBe(false);
  else expect(hasHeading).toBe(true);
});

test("the changelog keeps the unreleased section", () => {
  expect(headings).toContain("## [Não lançado]");
});
