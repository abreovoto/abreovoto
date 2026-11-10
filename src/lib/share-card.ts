/**
 * What each 1200×630 share card says, as data: one shape for the three kinds,
 * so the senator, candidate and home cards differ only in their values.
 */
import { createHash } from "node:crypto";
import type { Dataset } from "../data/load";
import { placar, type PlacarCandidato } from "../data/placar";
import type { Senador } from "../data/schema";
import { departureNote, formatDate, partyState, statusLabel } from "./text";

/** The scoreboard as the home card shows it: each running candidate's total, and who has no known position. */
export type CardScoreboard = {
  /** In the site's order: most support first, ties by name. */
  candidates: { id: string; name: string; partyState: string; total: number }[];
  noPosition: number;
  senators: number;
};

export type ShareCardModel = {
  kind: "senator" | "candidate" | "home";
  title: string;
  subtitle: string;
  status: string | null;
  number: number | null;
  numberLabel: string | null;
  hashtag: string;
  domain: string;
  date: string;
  /** Only on the home card. */
  scoreboard: CardScoreboard | null;
};

function common(d: Dataset, today: string) {
  return { hashtag: d.site.hashtag, domain: d.site.dominio, date: formatDate(today), scoreboard: null };
}

export function senatorCard(s: Senador, d: Dataset, today: string): ShareCardModel {
  return {
    kind: "senator",
    title: s.nome,
    subtitle: partyState(s),
    // A former occupant's card says when they left, never a vote that no longer counts.
    status: departureNote(s, today) ?? statusLabel(s, d),
    number: null,
    numberLabel: null,
    ...common(d, today),
  };
}

export function candidateCard(c: PlacarCandidato, d: Dataset, today: string): ShareCardModel {
  return {
    kind: "candidate",
    title: c.nome,
    subtitle: partyState(c),
    status: null,
    number: c.total,
    numberLabel: c.total === 1 ? "apoio" : "apoios",
    ...common(d, today),
  };
}

/**
 * The home card: the campaign line and the scoreboard of the day, dated. A preview kept by a
 * network, or a repost of an old post, then shows a dated snapshot that stays true, never a count
 * passed off as today's. The address shared from the site carries the card's version
 * (`homeShareUrl`), so a new post shows the current card.
 */
export function homeCard(d: Dataset, today: string): ShareCardModel {
  const p = placar(d);
  return {
    kind: "home",
    title: "O seu voto é secreto. O deles não precisa ser.",
    subtitle: "",
    status: null,
    number: null,
    numberLabel: null,
    ...common(d, today),
    scoreboard: {
      candidates: p.porCandidato.map((c) => ({ id: c.id, name: c.nome, partyState: partyState(c), total: c.total })),
      noPosition: p.semPosicao,
      senators: p.total,
    },
  };
}

/** The card read aloud, for `og:image:alt`: what the image says, in the order it says it. */
export function cardAlt(m: ShareCardModel): string {
  const lead = `Cartão do Abre o Voto: ${m.title}`;
  switch (m.kind) {
    case "senator":
      return `${lead} (${m.subtitle}), ${m.status}, ${m.date}`;
    case "candidate":
      return `${lead} (${m.subtitle}), ${m.number} ${m.numberLabel}, ${m.date}`;
    case "home": {
      const b = m.scoreboard!;
      const counts = b.candidates.map((c) => `${c.name} (${c.partyState}), ${c.total}`).join("; ");
      return `${lead} Placar em ${m.date}: ${counts}; ${b.noPosition} sem posição de ${b.senators} senadores.`;
    }
  }
}

/** A short hash of everything the card shows, so a changed card gets a new image URL. */
export function cardVersion(m: ShareCardModel): string {
  return createHash("sha256").update(JSON.stringify(m)).digest("hex").slice(0, 8);
}
