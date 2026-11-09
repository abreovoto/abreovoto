/**
 * The texts a visitor posts to ask a senator for their vote, or to share it once
 * declared. These are the site's own words, identical for every senator and for every
 * candidate, and they are read on the pre-launch review list. They carry no date.
 */
import { createHash } from "node:crypto";
import type { Candidato, Senador, Site } from "../data/schema";
import { absolute, senatorPath } from "./routes";
import { partyState, profileHandle } from "./text";

/** `@arthurlira_`, or null when the senator has no X profile in the data. */
export function xHandle(s: Senador): string | null {
  return s.redes.x ? profileHandle(s.redes.x) : null;
}

/** The candidate a senator declared for, by name; null while undeclared. */
export function declaredCandidateName(s: Senador, candidatos: Candidato[]): string | null {
  const decl = s.declaracao;
  if (decl.status === "nao_declarou") return null;
  const c = candidatos.find((x) => x.id === decl.candidato);
  if (!c) throw new Error(`unknown candidate ${decl.candidato}`);
  return c.nome;
}

/**
 * The senator's page as it is shared: the address plus a short version of the declaration
 * (status, candidate, source). Networks cache a link's preview card by its address, so a
 * senator who declares, or whose source changes, is shared under a new address and the
 * preview shows the current card; while nothing changes, the address stays the same.
 */
export function shareUrl(s: Senador): string {
  const d = s.declaracao;
  const key = JSON.stringify(d.status === "nao_declarou" ? [d.status] : [d.status, d.candidato, d.fonte.url]);
  return `${absolute(senatorPath(s.id))}?v=${createHash("sha256").update(key).digest("hex").slice(0, 8)}`;
}

const tail = (s: Senador, site: Site): string => `${shareUrl(s)} ${site.hashtag}`;

/** The text about the senator, for WhatsApp and the share sheet, and for X when the senator has no profile there. */
export function thirdPersonText(s: Senador, candidatos: Candidato[], site: Site): string {
  const who = `${s.nome} (${partyState(s)})`;
  const candidato = declaredCandidateName(s, candidatos);
  return candidato === null
    ? `${who} representa você no Senado, e você tem o direito de saber em quem vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${tail(s, site)}`
    : `${who} abriu o voto para presidente do Senado: ${candidato}, com fonte pública. Seus eleitores agradecem a transparência. Quem mais? ${tail(s, site)}`;
}

/** The text that mentions the senator by their handle on one network; the third-person text without one. */
function mentionText(handle: string | null, s: Senador, candidatos: Candidato[], site: Site): string {
  if (!handle) return thirdPersonText(s, candidatos, site);
  const candidato = declaredCandidateName(s, candidatos);
  return candidato === null
    ? `${handle}, quem te elegeu tem o direito de saber em quem você vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${tail(s, site)}`
    : `${handle} abriu o voto para presidente do Senado: ${candidato}, com fonte pública. Seus eleitores agradecem a transparência. Quem mais? ${tail(s, site)}`;
}

/** The post for X: it mentions the senator's X profile when there is one. */
export const xText = (s: Senador, candidatos: Candidato[], site: Site): string => mentionText(xHandle(s), s, candidatos, site);

export const xIntentUrl = (text: string): string => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

export const whatsappUrl = (text: string): string => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** "Cobrar no X" while the senator has not declared, "Compartilhar no X" afterwards. */
export const xLabel = (s: Senador): string => `${s.declaracao.status === "nao_declarou" ? "Cobrar" : "Compartilhar"} no X`;

/** A post's length as X counts it: every link is 23 characters. */
export const xLength = (text: string): number => [...text.replace(/https:\/\/\S+/g, "x".repeat(23))].length;
