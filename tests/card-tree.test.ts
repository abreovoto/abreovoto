import { expect, test } from "vitest";
import { loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
import { cardTree, type CardNode } from "../src/lib/card-tree";
import { renderCard } from "../src/lib/card-render";
import { candidateCard, homeCard, senatorCard } from "../src/lib/share-card";
import { palette } from "../src/styles/tokens";

const d = loadData();
const today = "2026-11-07";
const texts = (n: CardNode | string): string[] =>
  typeof n === "string" ? [n] : ([] as (CardNode | string)[]).concat(n.props.children ?? []).flatMap(texts);
const flexDivs = (n: CardNode | string): boolean =>
  typeof n === "string" ||
  ((n.type !== "div" || !Array.isArray(n.props.children) || n.props.style?.display === "flex") &&
    ([] as (CardNode | string)[]).concat(n.props.children ?? []).every(flexDivs));

test("every card ends with the date and the domain, and every multi-child div is flex", () => {
  const s = d.senadores.find((x) => x.id === "marcio-bittar")!;
  for (const m of [senatorCard(s, d, today), candidateCard(placar(d).porCandidato[0]!, d, today), homeCard(d, today)]) {
    const t = cardTree(m, null);
    expect(texts(t)).toContain("7/11/2026 · abreovoto.com");
    expect(texts(t)).toContain("#AbreOVotoSenador");
    expect(flexDivs(t)).toBe(true);
  }
});

test("the status colour follows the status, the same for every candidate", () => {
  const s = d.senadores.find((x) => x.id === "marcio-bittar")!;
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
  const colours = placar(d).porCandidato.map((c) => json(candidateCard(c, d, today)).replace(/[^#]*(#[0-9a-f]{6})/gi, "$1 "));
  expect(new Set(colours.map((c) => c.split(" ").sort().join(" "))).size).toBe(1);
});

test("a card renders to a 1200×630 PNG", async () => {
  const png = await renderCard(homeCard(d, today), null);
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
}, 20_000);
