import { expect, test } from "vitest";
import { loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
import { candidateCard, homeCard, senatorCard } from "../src/lib/share-card";

const d = loadData();
const today = "2026-11-07";

test("a senator card names the senator, state and status", () => {
  const s = d.senadores.find((x) => x.id === "marcio-bittar")!;
  const m = senatorCard(s, d, today);
  expect(m).toMatchObject({
    kind: "senator",
    title: "Marcio Bittar",
    subtitle: "PL-AC",
    status: "não declarou",
    hashtag: "#AbreOVotoSenador",
    domain: "abreovoto.com",
    date: "7/11/2026",
  });
});

test("the home card carries the not-declared count", () => {
  const m = homeCard(d, today);
  expect(m.number).toBe(placar(d).naoDeclararam);
  expect(m.numberLabel).toBe("ainda não declararam");
});

test("candidate cards are identical in shape and differ only in name and number", () => {
  const cards = placar(d).porCandidato.map((c) => candidateCard(c, d, today));
  expect(new Set(cards.map((c) => c.numberLabel)).size).toBe(1);
  expect(new Set(cards.map((c) => c.subtitle.length > 0)).size).toBe(1);
});

test("a departed senator's card carries the departure note instead of a status", () => {
  const s = d.senadores.find((x) => x.id === "cleitinho")!;
  expect(senatorCard(s, d, today).status).toBe("deixa o mandato em 6/1/2027");
});
