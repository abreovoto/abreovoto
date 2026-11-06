import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { emExercicio, loadData } from "../src/data/load";
import { UF } from "../src/data/schema";
import { ufWithDe } from "../src/lib/uf";

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

test("the home opens with the headline, the scoreboard and the three candidates in order", () => {
  const h = html("index.html");
  expect(h).toContain("seus senadores escolhem quem comanda o Senado");
  expect(h).not.toContain("Assinar"); // peticao.url is null today
  expect(h).toContain("Apoie no e-Cidadania");
  expect(h).toContain("não declararam");
  const order = ["Davi Alcolumbre", "Rogério Marinho", "Tereza Cristina"].map((n) => h.indexOf(n));
  expect(order.every((i) => i > 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(h).toContain('href="/candidato/alcolumbre/"');
  expect(h).toContain("41 votos elegem o presidente do Senado");
});

test("the home carries the 27 state groups with three senators each, hidden until chosen", () => {
  const h = html("index.html");
  const groups = h.match(/<div[^>]*data-uf="[A-Z]{2}"[^>]*hidden/g) ?? [];
  expect(groups).toHaveLength(27);
  expect(h).toContain('href="/estado/sp/"');
  // The bundler may print the key with backticks.
  expect(h).toMatch(/localStorage\.(getItem|setItem)\(["'`]uf["'`]/);
});

test("every state page has exactly three senators in office and the state's name", () => {
  const d = loadData();
  for (const uf of UF.options) {
    const h = html(`estado/${uf.toLowerCase()}/index.html`);
    expect(h).toContain(`Senadores ${ufWithDe(uf)}`);
    const names = emExercicio(d).filter((s) => s.uf === uf).map((s) => s.nome);
    expect(names).toHaveLength(3);
    for (const n of names) expect(h, uf).toContain(n);
    expect(h).not.toContain("Flávio Dino");
  }
});

test("the list has the 81 in office, alphabetical, with hidden filter controls", () => {
  const h = html("index.html");
  const names = emExercicio(loadData()).map((s) => s.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const positions = names.map((n) => h.indexOf(`data-nome="${n}"`));
  expect(positions.every((i) => i > 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(h).toMatch(/<form[^>]*data-filtros[^>]*hidden/);
  expect(h).toContain('aria-live="polite"');
  expect(h).toContain('href="/senador/marcio-bittar/"');
});

test("the home's scoreboard carries the hemicycle and the e-Cidadania line closes the page", () => {
  const h = html("index.html");
  expect(h.match(/<circle /g)?.length).toBe(81);
  expect(h).toMatch(/aria-label="81 cadeiras do Senado: \d+ não declararam, \d+ declararam"/);
  const idx = (t: string) => h.indexOf(t);
  expect(idx("Para 2029")).toBeGreaterThan(idx("Os 81 senadores"));
  expect(h).toContain("de&nbsp;voto&nbsp;aberto");
});
