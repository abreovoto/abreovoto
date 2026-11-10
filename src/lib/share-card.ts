/**
 * What each 1200×630 share card says, as data: one shape for the three kinds,
 * so the senator, candidate and home cards differ only in their values.
 */
import { createHash } from "node:crypto";
import type { Dataset } from "../data/load";
import type { PlacarCandidato } from "../data/placar";
import type { Senador } from "../data/schema";
import { departureNote, formatDate, partyState, statusLabel } from "./text";

export type ShareCardModel = {
  kind: "senator" | "candidate" | "home";
  title: string;
  subtitle: string;
  status: string | null;
  number: number | null;
  numberLabel: string | null;
  hashtag: string;
  domain: string;
  /** null on the home card, whose address is never versioned: nothing on it may age. */
  date: string | null;
};

function common(d: Dataset, today: string) {
  return { hashtag: d.site.hashtag, domain: d.site.dominio, date: formatDate(today) };
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
 * The home card says what the campaign asks and nothing that ages: the home address is typed
 * and pasted as is, and the networks keep its preview for days, so a count or a date on it
 * would be shown stale. The numbers live on the page.
 */
export function homeCard(d: Dataset, today: string): ShareCardModel {
  return {
    kind: "home",
    title: "O seu voto é secreto. O deles não precisa ser.",
    subtitle: "Em quem cada senador vota para presidente do Senado, sempre com a fonte.",
    status: null,
    number: null,
    numberLabel: null,
    ...common(d, today),
    date: null,
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
    case "home":
      return `${lead} ${m.subtitle}`;
  }
}

/** A short hash of everything the card shows, so a changed card gets a new image URL. */
export function cardVersion(m: ShareCardModel): string {
  return createHash("sha256").update(JSON.stringify(m)).digest("hex").slice(0, 8);
}
