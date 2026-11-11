import { expect, test } from "vitest";
import { asUndeclared, withoutPartySupport } from "./fixtures/undeclared";
import { loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
import { cardTree, type CardNode } from "../src/lib/card-tree";
import { homeFaces, renderCard } from "../src/lib/card-render";
import { candidateCard, homeCard, senatorCard, type ShareCardModel } from "../src/lib/share-card";
import { palette } from "../src/styles/tokens";

const d = withoutPartySupport(loadData());
const today = "2026-11-07";
const texts = (n: CardNode | string): string[] =>
  typeof n === "string" ? [n] : ([] as (CardNode | string)[]).concat(n.props.children ?? []).flatMap(texts);
const faces = (m: ShareCardModel) => Object.fromEntries((m.scoreboard?.candidates ?? []).map((c) => [c.id, `data:${c.id}`]));
const nodes = (n: CardNode | string): CardNode[] =>
  typeof n === "string" ? [] : [n, ...([] as (CardNode | string)[]).concat(n.props.children ?? []).flatMap(nodes)];
const flexDivs = (n: CardNode | string): boolean =>
  typeof n === "string" ||
  ((n.type !== "div" || !Array.isArray(n.props.children) || n.props.style?.display === "flex") &&
    ([] as (CardNode | string)[]).concat(n.props.children ?? []).every(flexDivs));

test("every card carries its date and the domain, and every multi-child div is flex", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
  for (const m of [senatorCard(s, d, today), candidateCard(placar(d).porCandidato[0]!, d, today), homeCard(d, today)]) {
    const t = cardTree(m, null, faces(m));
    expect(texts(t)).toContain(m.kind === "home" ? "abreovoto.com · placar em 7/11/2026" : "7/11/2026 · abreovoto.com");
    expect(texts(t)).toContain("#AbreOVotoSenador");
    expect(texts(t)).toContain("Abre o Voto");
    expect(flexDivs(t)).toBe(true);
  }
});

test("the home card draws every candidate the same: one face size, one column width, one type size", () => {
  const base = homeCard(d, today);
  const fourth = { id: "quarto", name: "Nome Bem Comprido Teste", partyState: "PT-SP", total: 0 };
  // The candidates of the data, and one more: past three the row scales, still the same for all.
  for (const m of [base, { ...base, scoreboard: { ...base.scoreboard!, candidates: [...base.scoreboard!.candidates, fourth] } }]) {
    const t = cardTree(m, null, faces(m));
    const imgs = nodes(t).filter((n) => n.type === "img");
    expect(imgs.map((n) => n.props.src)).toEqual(m.scoreboard!.candidates.map((c) => `data:${c.id}`)); // in the site's order
    expect(new Set(imgs.map((n) => `${n.props.style!.width}×${n.props.style!.height}`)).size).toBe(1);
    const columns = nodes(t).filter((n) => Array.isArray(n.props.children) && n.props.children.some((k) => typeof k !== "string" && k.type === "img"));
    expect(columns).toHaveLength(m.scoreboard!.candidates.length);
    expect(new Set(columns.map((n) => n.props.style!.width)).size).toBe(1);
    const totals = m.scoreboard!.candidates.map((c) => nodes(t).find((n) => n.props.children === String(c.total) && n.props.style?.fontFamily === "Display")!);
    expect(new Set(totals.map((n) => n.props.style!.fontSize)).size).toBe(1);
    expect(texts(t)).toContain(String(m.scoreboard!.noPosition));
    expect(texts(t)).toContain(`de ${m.scoreboard!.senators} senadores`);
  }
});

test("the home card refuses to render a candidate without a face", () => {
  expect(() => cardTree(homeCard(d, today), null, {})).toThrow(/no face/);
});

test("the status colour follows the status, the same for every candidate", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
  const declared = {
    ...s,
    declaracao: {
      status: "declarou" as const,
      candidato: "marinho",
      data: "2026-11-07",
      fonte: { tipo: "nota" as const, url: "https://example.com/n", titulo: null, trecho: "Voto em Marinho." },
    },
  };
  const json = (m: ReturnType<typeof senatorCard>) => JSON.stringify(cardTree(m, null));
  expect(json(senatorCard(s, d, today))).toContain(palette.light.undeclared);
  expect(json(senatorCard(declared, d, today))).toContain(palette.light.declared);
  for (const status of ["apoio mapeado a Rogério Marinho", "apoio pelo partido a Rogério Marinho", "apoio pela federação a Rogério Marinho"]) {
    const m = { ...senatorCard(s, d, today), status };
    expect(json(m), status).toContain(palette.light.mappedText);
    expect(json(m), status).not.toContain(palette.light.declared);
  }
  const colours = placar(d).porCandidato.map((c) => json(candidateCard(c, d, today)).replace(/[^#]*(#[0-9a-f]{6})/gi, "$1 "));
  expect(new Set(colours.map((c) => c.split(" ").sort().join(" "))).size).toBe(1);
});

test("a card renders to a 1200×630 PNG", async () => {
  const m = homeCard(d, today);
  const png = await renderCard(m, null, await homeFaces(m));
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
}, 20_000);

test("every fixed-size box inside a flex row keeps its size when the text beside it wraps", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
  const unshrinkable = (n: CardNode | string, inFlex: boolean): string[] => {
    if (typeof n === "string") return [];
    const st = n.props.style ?? {};
    const own = inFlex && typeof st.width === "number" && typeof st.height === "number" && st.flexShrink !== 0 ? [JSON.stringify(st)] : [];
    const kids = ([] as (CardNode | string)[]).concat(n.props.children ?? []);
    return own.concat(kids.flatMap((k) => unshrinkable(k, st.display === "flex")));
  };
  for (const m of [senatorCard(s, d, today), homeCard(d, today)]) expect(unshrinkable(cardTree(m, "data:", faces(m)), false)).toEqual([]);
});

test("the home card says to click, to share, and what clicking is for", () => {
  const t = texts(cardTree(homeCard(d, today), null, faces(homeCard(d, today))));
  expect(t).toContain("CLIQUE E COBRE O SEU SENADOR");
  expect(t).toContain("COMPARTILHE!");
  expect(t).toContain("O seu senador já abriu o voto?");
});
