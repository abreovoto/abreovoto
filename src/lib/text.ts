/**
 * Every label the site prints about a senator, as pure functions over the data.
 * Status labels are the founding rule's exact words: "não declarou" and
 * "declarou voto em" followed by the candidate's name.
 */
import { type Dataset, emExercicio } from "../data/load";
import type { Candidato, Senador } from "../data/schema";

/** `2027-01-06` → `6/1/2027`: day and month without a leading zero, full year. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}/${m}/${y}`;
}

/** `PL-RN` */
export function partyState(s: { partido: string; uf: string }): string {
  return `${s.partido}-${s.uf}`;
}

function candidateName(id: string, candidatos: Candidato[]): string {
  const c = candidatos.find((x) => x.id === id);
  if (!c) throw new Error(`unknown candidate ${id}`);
  return c.nome;
}

export function statusLabel(s: Senador, candidatos: Candidato[]): string {
  const decl = s.declaracao;
  switch (decl.status) {
    case "nao_declarou":
      return "não declarou";
    case "declarou":
      return `declarou voto em ${candidateName(decl.candidato, candidatos)}`;
    case "mostrou_na_sessao":
      return `mostrou o voto na sessão: ${candidateName(decl.candidato, candidatos)}`;
  }
}

/** For a substitute listed before taking the seat: "assume a vaga em 6/1/2027". */
export function assumeEmNote(s: Senador): string | null {
  return s.assume_em ? `assume a vaga em ${formatDate(s.assume_em)}` : null;
}

/** For a former occupant: "deixou o mandato em 20/2/2024". */
export function departureNote(s: Senador): string | null {
  return s.situacao === "deixou_mandato" && s.deixou_em ? `deixou o mandato em ${formatDate(s.deixou_em)}` : null;
}

export function isCandidate(s: Senador, candidatos: Candidato[]): boolean {
  return candidatos.some((c) => c.senador === s.id && c.situacao === "candidato");
}

/** `https://www.gazetadopovo.com.br/x` → `gazetadopovo.com.br` */
export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** The longest display name among those in office — the layout's worst case. */
export function longestName(d: Dataset): Senador {
  return emExercicio(d).reduce((a, b) => (b.nome.length > a.nome.length ? b : a));
}
