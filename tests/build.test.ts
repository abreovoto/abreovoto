import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { beforeAll, expect, test } from "vitest";
import { emExercicio, loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
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
  expect(
    (h.match(/width="1200" height="630"|width:1200px;height:630px|width: 1200px; height: 630px/g) ?? []).length,
  ).toBeGreaterThanOrEqual(3);
  expect(h).toContain('src="/cartao/placar.png"');
  expect(h).toContain("<select");
});

test("a card PNG exists for every senator, every candidate and the scoreboard, at 1200×630", () => {
  const d = loadData();
  const size = (p: string) => {
    const b = readFileSync(join(out, p));
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };
  for (const s of d.senadores) expect(size(`cartao/senador/${s.id}.png`), s.id).toEqual([1200, 630]);
  for (const c of placar(d).porCandidato) expect(size(`cartao/candidato/${c.id}.png`), c.id).toEqual([1200, 630]);
  expect(size("cartao/placar.png")).toEqual([1200, 630]);
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
  expect(h.match(/<article[\s\S]*?<\/article>/)![0]).not.toContain("text-undeclared"); // the card; the scoreboard below is the Senate's
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
      .replace(/\/_astro\/[^"]+/g, "ASSET")
      .replace(/\?v=[0-9a-f]{8}/g, "?v=HASH"); // each card has its own version
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
  expect(h).toMatch(/<a href="mailto:sen\.marciobittar@senado\.leg\.br"[^>]*>sen\.marciobittar@(<wbr>)?senado\.leg\.br<\/a>/);
  expect(h).toMatch(/<a href="https:\/\/www\.instagram\.com\/marciobittar_"[^>]*>@marciobittar_<\/a>/);
  expect(h).toMatch(/<a href="https:\/\/www25\.senado\.leg\.br[^"]*"[^>]*>Perfil oficial<\/a>/);
  const from = h.indexOf('id="links"');
  const section = h.slice(from, h.indexOf("</section>", from));
  expect(section.match(/<svg[^>]*aria-hidden="true"/g)?.length).toBe(3); // Senado, e-mail, Instagram; no X today
});

// Measured as it travels: compressed, as the host serves HTML, CSS and JS.
test("the home's HTML, CSS and JS stay under 300 KB compressed", () => {
  const h = html("index.html");
  const refs = [...new Set([...h.matchAll(/\/_astro\/[^"']+\.(css|js)/g)].map((m) => m[0]))];
  const gz = (b: Buffer | string) => gzipSync(b).length;
  const bytes = gz(h) + refs.reduce((n, r) => n + gz(readFileSync(join(out, r))), 0);
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

test("the senator cards' button reads 'Ver histórico'", () => {
  for (const p of ["index.html", "estado/rn/index.html"]) {
    expect(html(p)).toContain("Ver histórico");
    expect(html(p)).not.toContain("Ver página");
  }
});

test("the candidate badge agrees in gender, same rule for the three", () => {
  expect(html("senador/tereza-cristina/index.html")).toMatch(/>candidata</);
  expect(html("senador/tereza-cristina/index.html")).not.toMatch(/>candidato</);
  expect(html("senador/davi-alcolumbre/index.html")).toMatch(/>candidato</);
  expect(html("senador/rogerio-marinho/index.html")).toMatch(/>candidato</);
});

test("the methodology says why a scheduled departure already leaves the count", () => {
  expect(html("metodologia/index.html").replace(/ |&nbsp;/g, " ")).toContain(
    "Quando a saída já tem data marcada em lei, como a posse de um governador, a vaga passa ao suplente desde o registro, porque é ele quem vota em 1º de fevereiro.",
  );
});

test("a candidate's senator page links to the candidate page, the same way for the three", () => {
  for (const [s, c, nome] of [["davi-alcolumbre", "alcolumbre", "Davi Alcolumbre"], ["rogerio-marinho", "marinho", "Rogério Marinho"], ["tereza-cristina", "tereza-cristina", "Tereza Cristina"]]) {
    expect(html(`senador/${s}/index.html`)).toMatch(new RegExp(`<a href="/candidato/${c}/"[^>]*>Declarações de voto em ${nome}</a>`));
  }
  expect(html("senador/marcio-bittar/index.html")).not.toContain("Declarações de voto em");
});

test("on a phone the senator's links keep icon and value on one line", () => {
  const h = html("senador/marcio-bittar/index.html");
  expect(h).toMatch(/<dl class="[^"]*grid-cols-\[auto_1fr\][^"]*sm:grid-cols-\[8rem_1fr\]/);
  expect(h).toMatch(/<span class="max-sm:sr-only">E-mail<\/span>/);
});

test("on a phone a long e-mail breaks after the @, never in the middle of a word", () => {
  const h = html("senador/marcio-bittar/index.html");
  expect(h).toMatch(/sen\.marciobittar@<wbr>senado\.leg\.br/);
  expect(h).toMatch(/<dd class="[^"]*\btext-sm\b[^"]*\bsm:text-base\b/);
  expect(h).not.toMatch(/<dd class="[^"]*break-words/);
});

test("every page carries the Open Graph tags; senator and candidate pages point at their own card", () => {
  for (const p of allHtml(out)) {
    const h = html(p);
    expect(h, p).toMatch(/<meta property="og:image" content="https:\/\/abreovoto\.com\/cartao\/[^"]+\.png\?v=[0-9a-f]{8}">/);
    expect(h, p).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(h, p).toMatch(/<meta property="og:image:alt" content="Cartão do Abre o Voto: /);
  }
  expect(html("senador/marcio-bittar/index.html")).toContain('content="https://abreovoto.com/cartao/senador/marcio-bittar.png?v=');
  expect(html("senador/flavio-dino/index.html")).toContain('content="https://abreovoto.com/cartao/senador/flavio-dino.png?v=');
  expect(html("candidato/alcolumbre/index.html")).toContain('content="https://abreovoto.com/cartao/candidato/alcolumbre.png?v=');
  for (const p of ["index.html", "estado/rn/index.html", "como-funciona/index.html", "404.html"]) expect(html(p), p).toContain('content="https://abreovoto.com/cartao/placar.png?v=');
  expect(html("404.html")).not.toContain('property="og:url"');
  expect(html("index.html")).toContain('<meta property="og:url" content="https://abreovoto.com/">');
});

test("a senator page carries the actions in one order: X, share the card, WhatsApp, copy, download", () => {
  const h = html("senador/arthur-lira/index.html");
  expect(h).toContain('href="https://x.com/intent/post?text=%40arthurlira_%2C%20quem%20te%20elegeu');
  expect(h).toContain("%23AbreOVotoSenador");
  expect(h).toContain("Cobrar no X");
  expect(h).toContain("Compartilhar cartão");
  // The share sheet carries the card and the third-person text, the WhatsApp one: no mention,
  // since the sheet does not know where the text goes.
  expect(h).toContain('data-text="Arthur Lira (PP-AL) representa você no Senado');
  expect(h).toContain('href="https://wa.me/?text=Arthur%20Lira%20(PP-AL)%20representa%20voc%C3%AA');
  expect(h).toContain('data-card="/cartao/senador/arthur-lira.png"');
  expect(h).toContain('data-url="https://abreovoto.com/senador/arthur-lira/"');
  expect(h).toContain('href="/cartao/senador/arthur-lira.png" download="abreovoto-arthur-lira.png"');
  expect(h).toContain('role="status"');
  expect(h).not.toContain("data-share-instagram");
  const order = [/href="https:\/\/x\.com\/intent/, /<button[^>]*data-share-card/, /href="https:\/\/wa\.me/, /<button[^>]*data-copy-link/, /download="abreovoto-/].map((r) => h.search(r));
  expect(order.every((i) => i > 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

test("the share-card button shows only where the system share sheet takes files on a touch screen", () => {
  const h = html("senador/arthur-lira/index.html");
  expect(h).toMatch(/<button[^>]*data-share-card[^>]*class="[^"]*hidden \[\.share_&(amp;)?\]:inline-flex/);
  // Decided before paint, beside the "js" class, so the button never flashes on a desktop.
  expect(h).toContain('matchMedia("(pointer: coarse)")');
  expect(h).toContain('classList.add("share")');
});

test("a senator without an X profile gets the same actions; the X post names them in the third person", () => {
  const h = html("senador/marcio-bittar/index.html");
  expect(h).toContain('href="https://x.com/intent/post?text=Marcio%20Bittar%20(PL-AC)%20representa%20voc%C3%AA');
  expect(h).toMatch(/<a[^>]*href="https:\/\/x\.com\/intent[^"]*"[^>]*class="[^"]*border-accent bg-accent/);
  expect(h).toContain('data-text="Marcio Bittar (PL-AC) representa você');
  expect(h).toContain("wa.me/?text=");
});

test("a former occupant's page has no actions", () => {
  const h = html("senador/flavio-dino/index.html");
  expect(h).not.toContain("x.com/intent/post");
  expect(h).not.toContain("wa.me/?text=");
  expect(h).not.toContain("data-share-card");
});

test("the state cards carry the X action beside Ver histórico, on the home and on the state page", () => {
  for (const p of ["index.html", "estado/al/index.html"]) {
    const h = html(p);
    expect(h, p).toContain("%40arthurlira_%2C%20quem%20te%20elegeu");
    expect(h, p).toContain("Ver histórico");
  }
  const al = html("estado/al/index.html");
  expect(al.match(/href="https:\/\/x\.com\/intent/g)).toHaveLength(3);
  expect(al).not.toContain("wa.me/?text="); // primary only
  expect(al).not.toMatch(/<button[^>]*data-share-card/);
});

test("every senator page invites the visitor to the scoreboard with the totals and the call to act", () => {
  const d = loadData();
  const p = placar(d);
  for (const id of ["marcio-bittar", "flavio-dino"]) {
    const h = html(`senador/${id}/index.html`);
    // The number and its sentence are one paragraph, laid out in two places.
    expect(h, id).toMatch(new RegExp(`<p[^>]*>\\s*<span[^>]*>${p.naoDeclararam}</span>\\s*<span[^>]*>de ${p.total} senadores ainda não declararam o voto para presidente do Senado\\.</span>\\s*</p>`));
    expect(h, id).toContain("Você tem o direito de saber em quem cada um vota. Cobre que declarem antes.");
    expect(h, id).toMatch(/<a href="\/"[^>]*>(?:(?!<\/a>)[\s\S])*Ver o placar/); // the home's top: an anchor would cut the headline off
    expect(h, id).toContain('aria-label="81 cadeiras do Senado');
    expect(h, id).not.toContain("Assinar a petição"); // peticao.url is null today
  }
});

test("the senator page carries the source form and the footer points at it", () => {
  const h = html("senador/marcio-bittar/index.html");
  expect(h).toMatch(/<section id="fonte"[^>]*data-source-form/);
  // A native submit, if the script ever fails, must not put the visitor's text in the address bar.
  expect(h).toMatch(/<form method="post"/);
  expect(h).toContain('name="senador"');
  expect(h).toContain('value="marcio-bittar"');
  expect(h).toContain('href="#fonte"');
  expect(h).toContain("Envie a correção</a>");
  expect(h).not.toMatch(/<script[^>]+src="https:\/\/challenges\.cloudflare\.com/);
  expect(h).toContain("Só entra no placar o que tiver fonte pública");
  expect(h).toContain("Não envie dados pessoais.");
  expect(h.toLowerCase()).not.toContain("github.com/abreovoto/abreovoto/issues");
});

test("a departed senator's page carries the form too", () => {
  expect(html("senador/flavio-dino/index.html")).toContain('value="flavio-dino"');
});

test("/fonte/ offers every seat holder and the site itself; other pages' footers point at it", () => {
  const h = html("fonte/index.html");
  expect(h).toMatch(/<select name="senador"/);
  expect(h).toContain('<option value="site">Não é sobre um senador</option>');
  expect((h.match(/<option value="[a-z0-9-]+">/g) ?? []).length).toBe(loadData().senadores.length + 1);
  for (const page of ["index.html", "metodologia/index.html", "candidato/alcolumbre/index.html"]) expect(html(page)).toContain('href="/fonte/"');
  expect(readFileSync(join(out, "sitemap-0.xml"), "utf8")).toContain("https://abreovoto.com/fonte/");
});

test("no visitor-facing sentence of the form names GitHub or an issue", () => {
  // The form's own section: the footer's repository link is labelled for what it is.
  const h = html("fonte/index.html").match(/<section id="fonte"[\s\S]*?<\/section>/)![0];
  const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/href="[^"]*"/g, "");
  expect(visible.toLowerCase()).not.toMatch(/github|issue/);
});
