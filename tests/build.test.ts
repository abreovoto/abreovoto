import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
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
  // Visitors never land on GitHub to report an error.
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

test("the home's sections open with the same head: rule, title, note", () => {
  const h = html("index.html");
  for (const note of ["41 votos elegem o presidente do Senado", "três por estado", "em ordem alfabética"]) {
    expect(h).toMatch(new RegExp(`<h2 id="[a-z-]+"[^>]*>[^<]+</h2>\\s*<p[^>]*>${note}</p>`));
  }
  expect(h).not.toContain("41 votos elegem o presidente do Senado.");
  expect(html("estado/sp/index.html")).toMatch(/border-t border-line[^"]*"[^>]*>\s*<h2 id="em-exercicio"/);
});

test("the selects and the search share one 44 px construction; the selects draw their own chevron", () => {
  const h = html("index.html");
  const selects = h.match(/<select[^>]*>/g) ?? [];
  expect(selects).toHaveLength(3); // state selector, state filter, party filter
  const search = h.match(/<input type="search"[^>]*>/)?.[0] ?? "";
  const cls = (tag: string) => tag.match(/class="([^"]*)"/)?.[1] ?? "";
  for (const s of selects) {
    expect(cls(s)).toContain("select-chevron");
    expect(cls(s).replace(" select-chevron pr-11", "")).toBe(cls(search));
  }
  expect(cls(search)).toContain("h-[44px]");
  const radios = h.match(/<input type="radio" name="status"[^>]*>/g) ?? [];
  expect(radios).toHaveLength(3);
  for (const r of radios) expect(cls(r)).toContain("sr-only");
});

test("a senator page carries the card, the history and the links, and sends nobody to GitHub", () => {
  const h = html("senador/marcio-bittar/index.html");
  expect(h).toContain("<title>Marcio Bittar — Abre o Voto</title>");
  expect(h).toContain("não declarou");
  expect(h).toContain("entrou na lista como não declarou");
  expect(h).toContain("https://www25.senado.leg.br/web/senadores/senador/-/perfil/285");
  expect(h).toContain("mailto:sen.marciobittar@senado.leg.br");
  expect(h).toContain("https://www.instagram.com/marciobittar_");
  expect(h).not.toContain('action="/api/fonte"');
  expect(h).not.toContain("issues/new");
  expect(h.match(/<h1[ >]/g)).toHaveLength(1);
});

test("a departed senator's page keeps the note, drops the status, and names the successor", () => {
  const h = html("senador/flavio-dino/index.html");
  expect(h).toContain("deixou o mandato em 20/2/2024");
  // No status: no badge, no declaration, nothing in the description. The dated history still
  // says when the senator entered the list ("entrou na lista como não declarou").
  expect(h).not.toContain("text-undeclared");
  expect(h).not.toContain('id="declaracao"');
  expect(h).toContain('<meta name="description" content="Flávio Dino (PSB-MA) deixou o mandato em 20/2/2024.">');
  expect(h).toContain("renunciou ao mandato");
  expect(h).not.toContain('action="/api/fonte"');
  expect(h).toContain('href="/senador/ana-paula-lobato/"');
});

test("a successor's page carries the forecast note, identical for the three", () => {
  for (const id of ["alex-diniz", "luis-felipe-cunha", "cheila-moreira"]) expect(html(`senador/${id}/index.html`)).toContain("assume a vaga em 6/1/2027");
});

test("every entry of the data has a page", () => {
  for (const s of loadData().senadores) expect(existsSync(join(out, `senador/${s.id}/index.html`)), s.id).toBe(true);
});

test("the three candidate pages are the same page with different data", () => {
  const pages = ["alcolumbre", "marinho", "tereza-cristina"].map((id) => html(`candidato/${id}/index.html`));
  for (const h of pages) expect(h).toContain("até agora."); // zero declarations today
  for (const h of pages) expect(h.match(/<h1[ >]/g)).toHaveLength(1);
  expect(pages[0]).toContain('href="/senador/davi-alcolumbre/"');
  expect(pages[0]).toContain('href="/#lista"');
  const shape = (h: string) =>
    h
      .replace(/Davi Alcolumbre|Rogério Marinho|Tereza Cristina|UNIÃO-AP|PL-RN|PP-MS|davi-alcolumbre|rogerio-marinho|tereza-cristina|alcolumbre|marinho/g, "X")
      .replace(/\/_astro\/[^"]+/g, "ASSET");
  expect(shape(pages[1]!)).toBe(shape(pages[0]!));
  expect(shape(pages[2]!)).toBe(shape(pages[0]!));
});

test("the three text pages carry their sections and the contact anchor", () => {
  // Short words are tied to the next with a no-break space; read the text with plain spaces.
  const text = (p: string) => html(p).replace(/\u00a0|&nbsp;/g, " ");
  const cf = text("como-funciona/index.html");
  for (const s of ["Quem mantém este site?", "Este site apoia algum candidato?", "Esse dado está errado", 'id="contato"', "mailto:abreovoto@gmail.com", "Candidatos até agora"]) expect(cf).toContain(s);
  for (const s of ["anônim", "nome de pessoa", "lado só"]) expect(cf).not.toContain(s);
  // Every mention of the methodology in the prose links to it.
  expect(cf.match(/(?<!>)Metodologia(?!<\/a>)/g) ?? []).toEqual([]);
  expect(cf).toContain("Candidatos até agora: Davi Alcolumbre, Rogério Marinho e Tereza Cristina.");
  const m = text("metodologia/index.html");
  for (const s of ["O que conta como fonte", "Correções", "CC BY 4.0", 'href="/dados.json"']) expect(m).toContain(s);
  const p = text("privacidade/index.html");
  for (const s of ["Web Analytics", "localStorage", "GitHub", "Change.org"]) expect(p).toContain(s);
  for (const h of [cf, m, p]) expect(h.match(/<h1[ >]/g)).toHaveLength(1);
});

test("/dados.json is built and carries the scoreboard", () => {
  const o = JSON.parse(readFileSync(join(out, "dados.json"), "utf8"));
  expect(o.placar.total).toBe(81);
  expect(o.licenca).toBe("CC BY 4.0");
});

test("on the senator page a date shares its baseline with the text beside it", () => {
  const h = html("senador/marcio-bittar/index.html");
  const rows = h.match(/<li class="[^"]*sm:grid-cols-\[8rem_1fr\][^"]*"/g) ?? [];
  expect(rows.length).toBeGreaterThan(0);
  for (const r of rows) expect(r).toContain("items-baseline");
  // Declaração, Histórico and Links share one label column, so their values line up.
  expect(h).not.toContain("6.5rem");
});

test("the senator's links: a label with its icon, and only the value is the link", () => {
  const h = html("senador/marcio-bittar/index.html");
  expect(h).toMatch(/<a href="mailto:sen\.marciobittar@senado\.leg\.br"[^>]*>sen\.marciobittar@senado\.leg\.br<\/a>/);
  expect(h).toMatch(/<a href="https:\/\/www\.instagram\.com\/marciobittar_"[^>]*>@marciobittar_<\/a>/);
  expect(h).toMatch(/<a href="https:\/\/www25\.senado\.leg\.br[^"]*"[^>]*>Perfil oficial<\/a>/);
  const from = h.indexOf('id="links"');
  const section = h.slice(from, h.indexOf("</section>", from));
  expect(section.match(/<svg[^>]*aria-hidden="true"/g)?.length).toBe(3); // Senado, e-mail, Instagram; no X today
});

test("the home's HTML, CSS and JS stay under 300 KB", () => {
  const h = html("index.html");
  const refs = [...new Set([...h.matchAll(/\/_astro\/[^"']+\.(css|js)/g)].map((m) => m[0]))];
  const bytes = Buffer.byteLength(h) + refs.reduce((n, r) => n + statSync(join(out, r)).size, 0);
  expect(bytes).toBeLessThan(300 * 1024);
});

test("every page title is the site's name or ends with ' — Abre o Voto'", () => {
  const titles = allHtml(out)
    .filter((p) => !p.startsWith("estilo/"))
    .map((p) => [p, html(p).match(/<title>([^<]*)<\/title>/)?.[1]] as const);
  const off = titles.filter(([, t]) => t !== "Abre o Voto" && !t?.endsWith(" — Abre o Voto"));
  expect(off).toEqual([]);
});

test("each row of the list is clickable as a whole, through the one link it holds", () => {
  const rows = [...html("index.html").matchAll(/<li[^>]*data-nome="[^"]*"[^>]*>([\s\S]*?)<\/li>/g)];
  expect(rows).toHaveLength(81);
  for (const [li, inner] of rows) {
    expect(li).toMatch(/<li[^>]*class="[^"]*\brelative\b/);
    const links = [...inner!.matchAll(/<a [^>]*>/g)];
    expect(links).toHaveLength(1);
    expect(links[0]![0]).toMatch(/class="row-link"/);
  }
});

test("a senator who left the mandate is linked from no list", () => {
  for (const page of ["index.html", "estado/ma/index.html", ...["alcolumbre", "marinho", "tereza-cristina"].map((c) => `candidato/${c}/index.html`).filter((p) => existsSync(join(out, p)))]) {
    expect(html(page)).not.toContain('href="/senador/flavio-dino/"');
  }
  expect(html("senador/flavio-dino/index.html")).toContain('href="/senador/ana-paula-lobato/"');
});

test("without JavaScript the state links stand alone; with it they are hidden before paint", () => {
  const h = html("index.html");
  expect(h).toContain("Abra a página do seu estado:");
  expect(h).not.toContain("Escolha o estado acima");
  expect(h).toMatch(/classList\.add\("js"\)/);
  expect(h).toMatch(/<div data-no-js class="[^"]*\[\.js_&(amp;)?\]:hidden/);
});

test("every outbound source link carries noopener noreferrer", () => {
  for (const p of allHtml(out)) {
    for (const [a] of html(p).matchAll(/<a [^>]*rel="noopener"[^>]*>/g)) expect(a, p).toBe("");
  }
});

test("the 404's h1 looks like every other h1", () => {
  expect(html("404.html")).toMatch(/<h1 class="text-3xl font-semibold leading-tight sm:text-4xl">/);
});

test("a candidate card puts its label under the number, as the scoreboard does", () => {
  for (const [, label] of html("index.html").matchAll(/<p class="mt-auto[^"]*">\s*<span[^>]*>\d+<\/span>\s*(<span[^>]*>)declara/g)) {
    expect(label).toMatch(/\bblock\b/);
  }
  expect(html("index.html")).toMatch(/<p class="mt-auto[^"]*">\s*<span[^>]*>\d+<\/span>\s*<span class="[^"]*\bblock\b/);
});

test("each row of the list shows a chevron, hidden from screen readers", () => {
  const rows = [...html("index.html").matchAll(/<li[^>]*data-nome="[^"]*"[^>]*>([\s\S]*?)<\/li>/g)];
  expect(rows).toHaveLength(81);
  for (const [, inner] of rows) expect(inner).toMatch(/<span data-chevron aria-hidden="true"/);
});
