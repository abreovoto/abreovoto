/**
 * The texts a visitor posts to ask a senator for their vote, or to share it once
 * declared. These are the site's own words, identical for every senator and for every
 * candidate, and they are read on the pre-launch review list. They carry no date.
 */
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

const tail = (s: Senador, site: Site): string => `${absolute(senatorPath(s.id))} ${site.hashtag}`;

/** The post that mentions the senator on X; null without an X profile. */
export function xText(s: Senador, candidatos: Candidato[], site: Site): string | null {
  const handle = xHandle(s);
  if (!handle) return null;
  const candidato = declaredCandidateName(s, candidatos);
  return candidato === null
    ? `${handle}, quem te elegeu tem o direito de saber em quem você vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${tail(s, site)}`
    : `${handle} abriu o voto para presidente do Senado: ${candidato}, com fonte pública. Seus eleitores agradecem a transparência. Quem mais? ${tail(s, site)}`;
}

/** The text about the senator, for WhatsApp and Instagram. */
export function thirdPersonText(s: Senador, candidatos: Candidato[], site: Site): string {
  const who = `${s.nome} (${partyState(s)})`;
  const candidato = declaredCandidateName(s, candidatos);
  return candidato === null
    ? `${who} representa você no Senado, e você tem o direito de saber em quem vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? ${tail(s, site)}`
    : `${who} abriu o voto para presidente do Senado: ${candidato}, com fonte pública. Seus eleitores agradecem a transparência. Quem mais? ${tail(s, site)}`;
}

export const xIntentUrl = (text: string): string => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

export const whatsappUrl = (text: string): string => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** "Cobrar" while the senator has not declared, "Compartilhar" afterwards. */
export function actionLabels(s: Senador): { x: string; instagram: string } {
  const verb = s.declaracao.status === "nao_declarou" ? "Cobrar" : "Compartilhar";
  return { x: `${verb} no X`, instagram: `${verb} no Instagram` };
}

/** A post's length as X counts it: every link is 23 characters. */
export const xLength = (text: string): number => [...text.replace(/https:\/\/\S+/g, "x".repeat(23))].length;
