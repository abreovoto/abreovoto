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

/** Every page under the build output, as paths relative to it. */
function allHtml(dir: string, prefix = ""): string[] {
  return readdirSync(join(dir, prefix), { withFileTypes: true }).flatMap((e) => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) return allHtml(dir, rel);
    return e.name === "index.html" ? [rel] : [];
  });
}

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

test("every page has a canonical URL, the shell and no third party", () => {
  const pages = allHtml(out);
  expect(pages.length).toBeGreaterThanOrEqual(2);
  for (const p of pages) {
    const h = html(p);
    expect(h, p).toMatch(/<link rel="canonical" href="https:\/\/abreovoto\.com\/[^"]*\/?">/);
    expect(h, p).toContain('href="/como-funciona/"');
    expect(h, p).toContain("Toda informação tem fonte pública.");
    expect(h, p).not.toMatch(/https?:\/\/(?!abreovoto\.com|github\.com|www\.senado\.leg\.br|www25\.senado\.leg\.br|www12\.senado\.leg\.br|www\.instagram\.com|x\.com|www\.youtube\.com|www\.change\.org|creativecommons\.org)[a-z0-9.-]+\/[^"]*\.(js|css|woff2?)/);
  }
});

test("the footer's sentences and links are separated by whitespace", () => {
  const h = html("index.html");
  expect(h).not.toMatch(/pública\.<a|correção\.<a/);
  // Visitors never land on GitHub to report an error; the site's own form handles it.
  expect(h).not.toContain("issues/new");
  expect(h).toMatch(/aria-label="Código no GitHub"/);
  expect(h).toContain('href="/dados.json"');
  expect(h).toContain('href="/privacidade/"');
});

test("the sitemap lists the pages and not the styleguide; robots points at it; 404 exists", () => {
  const index = readFileSync(join(out, "sitemap-index.xml"), "utf8");
  expect(index).toContain("sitemap-0.xml");
  const map = readFileSync(join(out, "sitemap-0.xml"), "utf8");
  expect(map).toContain("https://abreovoto.com/");
  expect(map).not.toContain("/estilo/");
  expect(map).not.toContain("/404");
  expect(readFileSync(join(out, "robots.txt"), "utf8")).toContain("Sitemap: https://abreovoto.com/sitemap-index.xml");
  expect(html("404.html")).toContain("Página não encontrada");
  expect(html("404.html")).toMatch(/<meta name="robots" content="noindex">/);
  expect(html("404.html")).not.toContain('rel="canonical"');
});
