/**
 * The texts a visitor posts to ask a senator for their vote, or to share it once
 * declared. These are the site's own words, identical for every senator and for every
 * candidate, and they are read on the pre-launch review list. They carry no date.
 */
import { createHash } from "node:crypto";
import type { Dataset } from "../data/load";
import { type Posicao, posicao, proprioVoto } from "../data/posicao";
import type { Senador, Site } from "../data/schema";
import { absolute, bareUrl, senatorPath } from "./routes";
import { cardVersion, homeCard } from "./share-card";
import { partyState, profileHandle } from "./text";
import { ufWithDe } from "./uf";

/** `@arthurlira_`, or null when the senator has no X profile in the data. */
export function xHandle(s: Senador): string | null {
  return s.redes.x ? profileHandle(s.redes.x) : null;
}

function candidateName(id: string, d: Dataset): string {
  const c = d.candidatos.find((x) => x.id === id);
  if (!c) throw new Error(`unknown candidate ${id}`);
  return c.nome;
}

/**
 * The senator's page as it is shared: the address plus a short version of the position
 * (level, candidate, source). Networks cache a link's preview card by its address, so a
 * senator whose level, candidate or source changes is shared under a new address and the
 * preview shows the current card; while nothing changes, the address stays the same.
 */
export function shareUrl(s: Senador, d: Dataset): string {
  const p = posicao(s, d);
  // The party level's scope (party, caucus, federation) changes the card's words; the other levels'
  // keys stay as they were, so addresses already shared keep their version.
  const key = JSON.stringify(
    p.nivel === "nao_declarou" ? [p.nivel] : p.nivel === "partido" ? [p.nivel, p.candidato, p.fonte.url, p.origem] : [p.nivel, p.candidato, p.fonte.url],
  );
  return `${absolute(senatorPath(s.id))}?v=${createHash("sha256").update(key).digest("hex").slice(0, 8)}`;
}

/**
 * The home as it is shared: the address plus the home card's version. The card is dated, so
 * the address changes with the scoreboard and with the day, and a new post never shows the
 * preview a network kept from an earlier one.
 */
export function homeShareUrl(d: Dataset, today: string): string {
  return `${absolute("/")}?v=${cardVersion(homeCard(d, today))}`;
}

/**
 * What the home's copy button copies: the campaign line, what the site is for, the home's shared
 * address written without its scheme, and the hashtag.
 */
export function homeShareText(d: Dataset, today: string): string {
  return (
    "O seu voto é secreto. O deles não precisa ser. Veja se os senadores do seu estado já disseram em quem votam " +
    `para presidente do Senado, e pergunte a eles: ${bareUrl(homeShareUrl(d, today))} Compartilhe! ${d.site.hashtag}`
  );
}

const tail = (s: Senador, d: Dataset, site: Site): string => `${shareUrl(s, d)} ${site.hashtag}`;

const PARTY_THIRD = { partido: "O partido", bancada: "A bancada", federacao: "A federação" } as const;
const PARTY_OWN = { partido: "seu partido", bancada: "sua bancada", federacao: "sua federação" } as const;

/** A running candidate's word for themselves, agreeing in gender. */
function candidateWord(s: Senador, d: Dataset): string {
  return d.candidatos.find((c) => c.senador === s.id)?.genero === "f" ? "candidata" : "candidato";
}

/** "nele" or "nela", agreeing with the candidate the senator is asked about. */
function candidatePronoun(id: string, d: Dataset): string {
  return d.candidatos.find((c) => c.id === id)?.genero === "f" ? "nela" : "nele";
}

/**
 * The texts for one subject: `who` is the senator in the third person ("Nome (PL-RN)"), or
 * their handle when the post mentions them. The levels below the senator's own word ask,
 * politely, whether the vote will go to that candidate, for the sake of the senator's own
 * state's voters; a candidacy is shared, not asked about.
 */
function text(p: Posicao, s: Senador, d: Dataset, site: Site, handle: string | null): string {
  const who = handle ?? `${s.nome} (${partyState(s)})`;
  const end = tail(s, d, site);
  if (p.nivel === "nao_declarou") {
    return handle
      ? `${handle}, quem te elegeu tem o direito de saber em quem você vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${end}`
      : `${who} representa você no Senado, e você tem o direito de saber em quem vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${end}`;
  }
  const x = candidateName(p.candidato, d);
  const nele = candidatePronoun(p.candidato, d);
  const voters = `os eleitores ${ufWithDe(s.uf)} a acompanhar`;
  if (proprioVoto(p)) {
    return `${who} abriu o voto para presidente do Senado: ${x}, com fonte pública. Seus eleitores agradecem a transparência. Quem mais? ${end}`;
  }
  switch (p.origem) {
    case "candidatura":
      return `${who} é ${candidateWord(s, d)} a presidente do Senado. Veja em quem cada senador vota, com fonte. ${end}`;
    case "partido":
    case "bancada":
    case "federacao":
      return handle
        ? `${handle}, ${PARTY_OWN[p.origem]} anunciou apoio a ${x} para presidente do Senado. Com todo o respeito: o seu voto também será ${nele}? A resposta ajuda ${voters}. ${end}`
        : `${PARTY_THIRD[p.origem]} de ${who} anunciou apoio a ${x} para presidente do Senado. O voto será ${nele}? Uma declaração direta ajuda ${voters}. ${end}`;
    default:
      return handle
        ? `${handle}, o placar registra com fonte pública o seu apoio a ${x} para presidente do Senado, mas falta você dizer com todas as letras: o seu voto será ${nele}? A resposta ajuda ${voters}. ${end}`
        : `O placar registra com fonte pública o apoio de ${who} a ${x} para presidente do Senado. O voto será ${nele}? Falta uma declaração direta, que ajuda ${voters}. ${end}`;
  }
}

/** The text about the senator, for WhatsApp and the share sheet, and for X when the senator has no profile there. */
export const thirdPersonText = (s: Senador, d: Dataset, site: Site): string => text(posicao(s, d), s, d, site, null);

/** The post for X: it mentions the senator's X profile when there is one. */
export const xText = (s: Senador, d: Dataset, site: Site): string => text(posicao(s, d), s, d, site, xHandle(s));

export const xIntentUrl = (text: string): string => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

export const whatsappUrl = (text: string): string => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** "Cobrar no X" until the senator says it in their own words (mapped and party support included); "Compartilhar no X" afterwards, and for a candidacy. */
export function xLabel(s: Senador, d: Dataset): string {
  const p = posicao(s, d);
  return `${!proprioVoto(p) && p.origem !== "candidatura" ? "Cobrar" : "Compartilhar"} no X`;
}

/** A post's length as X counts it: every link is 23 characters. */
export const xLength = (text: string): number => [...text.replace(/https:\/\/\S+/g, "x".repeat(23))].length;
