/**
 * What each 1200×630 share card says, as data: one shape for the three kinds,
 * so the senator, candidate and home cards differ only in their values.
 */
import { createHash } from "node:crypto";
import type { Dataset } from "../data/load";
import { type PlacarCandidato, placar } from "../data/placar";
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
  date: string;
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
    status: departureNote(s, today) ?? statusLabel(s, d.candidatos),
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
    numberLabel: c.total === 1 ? "declaração" : "declarações",
    ...common(d, today),
  };
}

export function homeCard(d: Dataset, today: string): ShareCardModel {
  const p = placar(d);
  return {
    kind: "home",
    title: "Eleição da Presidência do Senado",
    subtitle: `${p.total} senadores votam em ${formatDate(d.site.eleicao)}, em voto secreto`,
    status: null,
    number: p.naoDeclararam,
    numberLabel: "ainda não declararam",
    ...common(d, today),
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
      return `${lead}, ${m.number} ${m.numberLabel}, ${m.date}`;
  }
}

/** A short hash of everything the card shows, so a changed card gets a new image URL. */
export function cardVersion(m: ShareCardModel): string {
  return createHash("sha256").update(JSON.stringify(m)).digest("hex").slice(0, 8);
}
