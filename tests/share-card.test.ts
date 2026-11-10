import { expect, test } from "vitest";
import { asUndeclared } from "./fixtures/undeclared";
import { loadData } from "../src/data/load";
import { placar } from "../src/data/placar";
import { candidateCard, cardAlt, cardVersion, homeCard, senatorCard } from "../src/lib/share-card";

const d = loadData();
const today = "2026-11-07";

test("a senator card names the senator, state and status", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
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

test("the home card carries the campaign line and the scoreboard of the day, dated", () => {
  const m = homeCard(d, today);
  const p = placar(d);
  expect(m.title).toBe("O seu voto é secreto. O deles não precisa ser.");
  expect(m.date).toBe("7/11/2026");
  expect(m.scoreboard).toEqual({
    candidates: p.porCandidato.map((c) => ({ id: c.id, name: c.nome, partyState: `${c.partido}-${c.uf}`, total: c.total })),
    noPosition: p.semPosicao,
    senators: p.total,
  });
  // Dated, so its version changes with the day: an address carrying it is new every day.
  expect(cardVersion(homeCard(d, "2026-11-08"))).not.toBe(cardVersion(m));
});

test("candidate cards are identical in shape and differ only in name and number", () => {
  const cards = placar(d).porCandidato.map((c) => candidateCard(c, d, today));
  for (const [c, card] of placar(d).porCandidato.map((c, i) => [c, cards[i]!] as const)) expect(card.numberLabel).toBe(c.total === 1 ? "apoio" : "apoios");
  expect(new Set(cards.map((c) => c.subtitle.length > 0)).size).toBe(1);
});

test("a party-level senator's card says the support is the party's", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
  const withParty = {
    ...d,
    partidos: [
      {
        id: "teste",
        partido: s.partido,
        escopo: "partido" as const,
        candidato: "marinho",
        data: "2026-11-05",
        fonte: { tipo: "nota" as const, url: "https://example.org/n", titulo: null, trecho: "apoio" },
      },
    ],
  };
  expect(senatorCard(s, withParty, today).status).toBe("apoio pelo partido a Rogério Marinho");
});

test("a departed senator's card carries the departure note instead of a status", () => {
  const s = d.senadores.find((x) => x.id === "cleitinho")!;
  expect(senatorCard(s, d, today).status).toBe("deixa o mandato em 6/1/2027");
});

test("the alt text reads the card aloud", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
  expect(cardAlt(senatorCard(s, d, today))).toBe("Cartão do Abre o Voto: Marcio Bittar (PL-AC), não declarou, 7/11/2026");
  const b = homeCard(d, today).scoreboard!;
  const counts = b.candidates.map((c) => `${c.name} (${c.partyState}), ${c.total}`).join("; ");
  expect(cardAlt(homeCard(d, today))).toBe(
    `Cartão do Abre o Voto: O seu voto é secreto. O deles não precisa ser. Placar em 7/11/2026: ${counts}; ${b.noPosition} sem posição de ${b.senators} senadores.`,
  );
});

test("the version is stable for an equal model and changes with the status or the date", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
  const a = cardVersion(senatorCard(s, d, today));
  expect(a).toMatch(/^[0-9a-f]{8}$/);
  expect(cardVersion(senatorCard(s, d, today))).toBe(a);
  expect(cardVersion(senatorCard(s, d, "2026-11-08"))).not.toBe(a);
  expect(cardVersion(senatorCard({ ...s, nome: "Outro Nome" }, d, today))).not.toBe(a);
});
