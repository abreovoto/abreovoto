import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";

let out: string;
beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "abreovoto-dist-"));
  execFileSync("npx", ["astro", "build", "--outDir", out], { stdio: "pipe" });
}, 180_000);

const html = (path: string) => readFileSync(join(out, path), "utf8");

test("the home applies a saved theme before paint and otherwise follows the system", () => {
  const h = html("index.html");
  expect(h).toMatch(/<html lang="pt-BR">/);
  expect(h).toMatch(/localStorage\.getItem\("tema"\)/);
  const css = readdirSync(join(out, "_astro"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(out, "_astro", f), "utf8"))
    .join("\n");
  expect(css).toMatch(/prefers-color-scheme:\s*dark/);
});

test.each(["index.html", "estilo/index.html"])("%s requests no third party", (page) => {
  expect(html(page)).not.toMatch(/https?:\/\/(fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr)/);
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
