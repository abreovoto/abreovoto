import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";

let out: string;
beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "abreovoto-dist-"));
  execFileSync("npx", ["astro", "build", "--outDir", out], { stdio: "pipe" });
}, 180_000);

const html = (path: string) => readFileSync(join(out, path), "utf8");

test("the home sets the theme before paint and falls back to the system", () => {
  const h = html("index.html");
  expect(h).toMatch(/<html lang="pt-BR" data-theme="light">/);
  expect(h).toMatch(/localStorage\.getItem\("tema"\)/);
  expect(h).toMatch(/prefers-color-scheme: dark/);
});

test("no page requests a third party", () => {
  const h = html("index.html");
  expect(h).not.toMatch(/https?:\/\/(fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr)/);
});

test("the styleguide renders every component with real data and is not indexed", () => {
  const h = html("estilo/index.html");
  expect(h).toMatch(/<meta name="robots" content="noindex">/);
  expect(h).toContain("não declararam");
  expect(h).toContain("Davi Alcolumbre");
  expect(h).toContain("assume a vaga em 6/1/2027");
  expect(h).toContain("#AbreOVotoSenador");
  expect(
    (h.match(/width="1200" height="630"|width:1200px;height:630px|width: 1200px; height: 630px/g) ?? []).length,
  ).toBeGreaterThanOrEqual(3);
  expect(h).toContain("<select");
});

test("the favicons exist and are referenced", () => {
  for (const f of ["favicon.svg", "favicon.ico", "apple-touch-icon.png"]) expect(existsSync(join(out, f)), f).toBe(true);
  expect(html("index.html")).toMatch(/rel="icon" href="\/favicon\.svg"/);
});
