import { expect, test } from "vitest";
import { asUndeclared, withoutPartySupport } from "./fixtures/undeclared";
import { type Dataset, emExercicio, loadData } from "../src/data/load";
import type { PartidoApoio, Senador } from "../src/data/schema";
import {
  thirdPersonText,
  whatsappUrl,
  xHandle,
  xIntentUrl,
  xLabel,
  xLength,
  xText,
  shareUrl,
  homeShareText,
  homeShareUrl,
} from "../src/lib/share-text";
import { cardVersion, homeCard } from "../src/lib/share-card";

const d = withoutPartySupport(loadData());
const by = (id: string) => d.senadores.find((s) => s.id === id)!;
const declared = (s: ReturnType<typeof by>, candidato: string) => ({
  ...s,
  declaracao: { status: "declarou" as const, candidato, data: "2026-11-07", fonte: { tipo: "nota" as const, url: "https://example.com/n", titulo: null, trecho: "Voto." } },
});

test("the X text mentions the senator, links the page and carries the hashtag", () => {
  const s = by("arthur-lira");
  expect(xText(s, d, d.site)).toBe(
    `@arthurlira_, quem te elegeu tem o direito de saber em quem você vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${shareUrl(s, d)} #AbreOVotoSenador`,
  );
});

test("without an X profile, the X text is the third-person one", () => {
  const s = asUndeclared(by("mara-rocha")); // no X profile; the not-declared text
  const third =
    `Mara Rocha (REPUBLICANOS-AC) representa você no Senado, e você tem o direito de saber em quem vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${shareUrl(s, d)} #AbreOVotoSenador`;
  expect(xHandle(s)).toBeNull();
  expect(thirdPersonText(s, d, d.site)).toBe(third);
  expect(xText(s, d, d.site)).toBe(third);
});

test("a declared senator's texts name the candidate from the data and are the same shape for the three", () => {
  const s = by("arthur-lira");
  const texts = d.candidatos.map((c) => xText(declared(s, c.id), d, d.site));
  expect(texts[0]).toBe(
    `@arthurlira_ abriu o voto para presidente do Senado: Davi Alcolumbre, com fonte pública. Seus eleitores agradecem a transparência. Quem mais? ${shareUrl(declared(s, "alcolumbre"), d)} #AbreOVotoSenador`,
  );
  expect(new Set(texts.map((t, i) => t.replace(d.candidatos[i]!.nome, "X").replace(/\?v=[0-9a-f]{8}/, "?v=V"))).size).toBe(1);
  expect(thirdPersonText(declared(s, "marinho"), d, d.site)).toContain("Arthur Lira (PP-AL) abriu o voto para presidente do Senado: Rogério Marinho,");
  expect(xLabel(declared(s, "marinho"), d)).toBe("Compartilhar no X");
  expect(xLabel(s, d)).toBe("Cobrar no X");
});

test("every text fits X and carries no date", () => {
  for (const s of emExercicio(d)) {
    for (const t of [xText(s, d, d.site), thirdPersonText(s, d, d.site)]) {
      expect(xLength(t), s.id).toBeLessThanOrEqual(280);
      expect(t).not.toMatch(/\d\/\d|1º|fevereiro/);
    }
  }
  const longest = [...d.candidatos].sort((a, b) => b.nome.length - a.nome.length)[0]!;
  const s = by("professora-dorinha-seabra"); // the longest name in office, with an X profile
  for (const f of [xText, thirdPersonText]) expect(xLength(f(declared(s, longest.id), d, d.site))).toBeLessThanOrEqual(280);
});

test("the intent URLs encode the text", () => {
  expect(xIntentUrl("a b #c")).toBe("https://x.com/intent/post?text=a%20b%20%23c");
  expect(whatsappUrl("a b")).toBe("https://wa.me/?text=a%20b");
});

test("the shared address carries a version of the declaration, so a changed status is a new link for the networks' caches", () => {
  const s = asUndeclared(by("arthur-lira"));
  expect(shareUrl(s, d)).toMatch(/^https:\/\/abreovoto\.com\/senador\/arthur-lira\/\?v=[0-9a-f]{8}$/);
  expect(shareUrl(s, d)).toBe(shareUrl(asUndeclared(by("arthur-lira")), d)); // stable while nothing changes
  const a = shareUrl(declared(s, "alcolumbre"), d);
  expect(a).not.toBe(shareUrl(s, d)); // declaring changes it
  expect(shareUrl(declared(s, "marinho"), d)).not.toBe(a); // another candidate changes it
  const better = { ...declared(s, "alcolumbre"), declaracao: { ...declared(s, "alcolumbre").declaracao, fonte: { tipo: "video" as const, url: "https://example.com/v", titulo: null, trecho: "Voto." } } };
  expect(shareUrl(better, d)).not.toBe(a); // a new source changes it
});

test("the home's shared address carries the home card's version, so a new day or a new count is a new link", () => {
  expect(homeShareUrl(d, "2026-11-07")).toBe(`https://abreovoto.com/?v=${cardVersion(homeCard(d, "2026-11-07"))}`);
  expect(homeShareUrl(d, "2026-11-07")).toBe(homeShareUrl(d, "2026-11-07"));
  expect(homeShareUrl(d, "2026-11-08")).not.toBe(homeShareUrl(d, "2026-11-07"));
  const lira = (s: Senador): Dataset => ({ ...d, senadores: d.senadores.map((x) => (x.id === "arthur-lira" ? s : x)) });
  const before = asUndeclared(by("arthur-lira"));
  expect(homeShareUrl(lira(declared(before, "alcolumbre")), "2026-11-07")).not.toBe(homeShareUrl(lira(before), "2026-11-07"));
});

const fonte = { tipo: "materia" as const, url: "https://example.com/m", titulo: null, trecho: "Entre os apoiadores." };
const mapped = (s: Senador, candidato: string): Senador => ({
  ...s,
  declaracao: { status: "apoio_mapeado", candidato, data: "2026-11-07", fonte },
});
const withParty = (s: Senador, candidato: string, escopo: PartidoApoio["escopo"]): Dataset => ({
  ...d,
  partidos: [{ id: "teste", partido: s.partido, escopo, candidato, data: "2026-11-07", fonte: { ...fonte, tipo: "nota" } }],
});

test("mapped support: the texts ask the senator to confirm in public", () => {
  const lira = mapped(by("arthur-lira"), "marinho");
  expect(thirdPersonText(mapped(asUndeclared(by("mara-rocha")), "marinho"), d, d.site)).toBe(
    `Mara Rocha (REPUBLICANOS-AC) aparece em fonte pública como apoio a Rogério Marinho para presidente do Senado, mas ainda não declarou o voto. Vai confirmar em público? ${shareUrl(mapped(by("mara-rocha"), "marinho"), d)} #AbreOVotoSenador`,
  );
  expect(xText(lira, d, d.site)).toBe(
    `@arthurlira_, uma fonte pública aponta seu apoio a Rogério Marinho para presidente do Senado. Vai confirmar em público? ${shareUrl(lira, d)} #AbreOVotoSenador`,
  );
  expect(xLabel(lira, d)).toBe("Cobrar no X");
});

test("party, caucus and federation support: the texts name whose announcement it is", () => {
  const lira = asUndeclared(by("arthur-lira"));
  const mara = asUndeclared(by("mara-rocha"));
  const cases: [PartidoApoio["escopo"], string, string][] = [
    ["partido", "O partido", "seu partido"],
    ["bancada", "A bancada", "sua bancada"],
    ["federacao", "A federação", "sua federação"],
  ];
  for (const [escopo, third, own] of cases) {
    const dm = withParty(mara, "alcolumbre", escopo);
    expect(thirdPersonText(mara, dm, d.site)).toBe(
      `${third} de Mara Rocha (REPUBLICANOS-AC) anunciou apoio a Davi Alcolumbre para presidente do Senado, mas Mara Rocha ainda não declarou o voto. Vai confirmar em público? ${shareUrl(mara, dm)} #AbreOVotoSenador`,
    );
    const dl = withParty(lira, "alcolumbre", escopo);
    expect(xText(lira, dl, d.site)).toBe(
      `@arthurlira_, ${own} anunciou apoio a Davi Alcolumbre para presidente do Senado. Você confirma em público? ${shareUrl(lira, dl)} #AbreOVotoSenador`,
    );
    expect(xLabel(lira, dl)).toBe("Cobrar no X");
  }
});

test("a running candidate's texts say they are a candidate, agreeing in gender, the same for every candidate", () => {
  for (const c of d.candidatos.filter((x) => x.situacao === "candidato")) {
    const s = asUndeclared(by(c.senador));
    const word = c.genero === "f" ? "candidata" : "candidato";
    const who = `${s.nome} (${s.partido}-${s.uf})`;
    expect(thirdPersonText(s, d, d.site)).toBe(`${who} é ${word} a presidente do Senado. Veja em quem cada senador vota, com fonte. ${shareUrl(s, d)} #AbreOVotoSenador`);
    const handle = xHandle(s);
    expect(xText(s, d, d.site)).toBe(`${handle ?? who} é ${word} a presidente do Senado. Veja em quem cada senador vota, com fonte. ${shareUrl(s, d)} #AbreOVotoSenador`);
    expect(xLabel(s, d)).toBe("Compartilhar no X");
  }
});

test("every level's text fits X for the longest name and the longest candidate", () => {
  const s = by("professora-dorinha-seabra"); // the longest name in office, with an X profile
  const noX = { ...s, redes: { ...s.redes, x: null } };
  const longest = [...d.candidatos].sort((a, b) => b.nome.length - a.nome.length)[0]!;
  for (const who of [s, noX]) {
    const variants: [Senador, Dataset][] = [
      [mapped(who, longest.id), d],
      ...(["partido", "bancada", "federacao"] as const).map((e): [Senador, Dataset] => [asUndeclared(who), withParty(who, longest.id, e)]),
    ];
    for (const [x, dx] of variants) {
      expect(xLength(xText(x, dx, d.site))).toBeLessThanOrEqual(280);
      expect(xLength(thirdPersonText(x, dx, d.site))).toBeLessThanOrEqual(280);
    }
  }
  const candidate = d.candidatos.find((c) => c.situacao === "candidato")!;
  const seat = asUndeclared(by(candidate.senador));
  expect(xLength(thirdPersonText({ ...seat, nome: s.nome }, d, d.site))).toBeLessThanOrEqual(280);
});

test("the shared address tells a mapped senator from a declared one with the same candidate and source", () => {
  const s = asUndeclared(by("arthur-lira"));
  const own = { ...s, declaracao: { status: "declarou" as const, candidato: "marinho", data: "2026-11-07", fonte } };
  expect(shareUrl(mapped(s, "marinho"), d)).not.toBe(shareUrl(own, d));
  expect(shareUrl(s, withParty(s, "marinho", "partido"))).not.toBe(shareUrl(s, d));
});

test("the shared address tells a caucus announcement from a party one with the same candidate and source", () => {
  const s = asUndeclared(by("arthur-lira"));
  expect(shareUrl(s, withParty(s, "marinho", "bancada"))).not.toBe(shareUrl(s, withParty(s, "marinho", "partido")));
  expect(shareUrl(s, withParty(s, "marinho", "federacao"))).not.toBe(shareUrl(s, withParty(s, "marinho", "partido")));
});

test("the home's copy text is the ready-made post, with the shared address written without its scheme", () => {
  const v = cardVersion(homeCard(d, "2026-11-07"));
  expect(homeShareText(d, "2026-11-07")).toBe(
    `O seu voto é secreto. O deles não precisa ser. Veja se os senadores do seu estado já disseram em quem votam para presidente do Senado, e pergunte a eles: abreovoto.com/?v=${v} Compartilhe! #AbreOVotoSenador`,
  );
});
