import { expect, test } from "vitest";
import { loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
import { candidateCard, cardAlt, cardVersion, homeCard, senatorCard } from "../src/lib/share-card";

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

test("the alt text reads the card aloud", () => {
  const s = d.senadores.find((x) => x.id === "marcio-bittar")!;
  expect(cardAlt(senatorCard(s, d, today))).toBe("Cartão do Abre o Voto: Marcio Bittar (PL-AC), não declarou, 7/11/2026");
  expect(cardAlt(homeCard(d, today))).toMatch(/^Cartão do Abre o Voto: Eleição da Presidência do Senado, \d+ ainda não declararam, 7\/11\/2026$/);
});

test("the version is stable for an equal model and changes with the status or the date", () => {
  const s = d.senadores.find((x) => x.id === "marcio-bittar")!;
  const a = cardVersion(senatorCard(s, d, today));
  expect(a).toMatch(/^[0-9a-f]{8}$/);
  expect(cardVersion(senatorCard(s, d, today))).toBe(a);
  expect(cardVersion(senatorCard(s, d, "2026-11-08"))).not.toBe(a);
  expect(cardVersion(senatorCard({ ...s, nome: "Outro Nome" }, d, today))).not.toBe(a);
});
