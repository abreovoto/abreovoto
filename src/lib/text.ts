/**
 * Every label the site prints about a senator, as pure functions over the data.
 * Status labels are the site's exact words, one per level ("não declarou", "declarou voto em",
 * "apoio mapeado a", "apoio pelo partido a", …), the candidate's name after all but the first.
 */
import { type Dataset, emExercicio } from "../data/load";
import { type Posicao, posicao } from "../data/posicao";
import { type Candidato, type FonteTipo, type Senador, todayUtc } from "../data/schema";

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

/** The label of the level in effect, without the candidate's name. */
export function statusPrefix(p: Posicao): string {
  switch (p.nivel) {
    case "nao_declarou":
      return "não declarou";
    case "declarou":
      return "declarou voto em";
    case "mostrou_na_sessao":
      return "mostrou o voto na sessão:";
    case "apoio_mapeado":
      return "apoio mapeado a";
    case "partido":
      return p.origem === "federacao" ? "apoio pela federação a" : "apoio pelo partido a";
  }
}

/** The badge's full text: the level's label and, when there is one, the candidate's name. */
export function statusLabel(s: Senador, d: Dataset): string {
  const p = posicao(s, d);
  const prefix = statusPrefix(p);
  return p.candidato === null ? prefix : `${prefix} ${candidateName(p.candidato, d.candidatos)}`;
}

/**
 * For a substitute listed before taking the seat: "assume a vaga em 6/1/2027"
 * while the date is ahead, "assumiu a vaga em 6/1/2027" from that day on.
 */
export function assumeEmNote(s: Senador, today = todayUtc()): string | null {
  if (!s.assume_em) return null;
  return `${today < s.assume_em ? "assume" : "assumiu"} a vaga em ${formatDate(s.assume_em)}`;
}

/**
 * For a former occupant: "deixou o mandato em 20/2/2024"; for a departure already
 * scheduled but still ahead, "deixa o mandato em 6/1/2027".
 */
export function departureNote(s: Senador, today = todayUtc()): string | null {
  if (s.situacao !== "deixou_mandato" || !s.deixou_em) return null;
  return `${today < s.deixou_em ? "deixa" : "deixou"} o mandato em ${formatDate(s.deixou_em)}`;
}

/** The badge a running candidate's senator card carries, agreeing in gender; null for everyone else. */
export function candidateBadge(s: Senador, candidatos: Candidato[]): "candidata" | "candidato" | null {
  const c = candidatos.find((c) => c.senador === s.id && c.situacao === "candidato");
  if (!c) return null;
  return c.genero === "f" ? "candidata" : "candidato";
}

/** `https://www.gazetadopovo.com.br/x` → `gazetadopovo.com.br` */
export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** The longest display name among those in office — the layout's worst case. */
export function longestName(d: Dataset): Senador {
  return emExercicio(d).reduce((a, b) => (b.nome.length > a.nome.length ? b : a));
}

const SOURCE_TYPES: Record<FonteTipo, string> = {
  video: "vídeo",
  post: "publicação no perfil oficial",
  materia: "matéria com citação direta",
  nota: "nota oficial",
  email_institucional: "e-mail institucional",
};

// A mapped source may be the candidate's or a party's post, a report or a list: never call it the senator's own.
const MAPPED_SOURCE_TYPES: Record<FonteTipo, string> = {
  video: "vídeo",
  post: "publicação",
  materia: "matéria jornalística",
  nota: "nota oficial",
  email_institucional: "e-mail institucional",
};

const PARTY_SOURCES = { partido: "anúncio do partido", bancada: "anúncio da bancada", federacao: "anúncio da federação" } as const;

/** The kind of source behind the level in effect, in words; empty when there is none. */
export function positionSourceLabel(p: Posicao): string {
  if (p.nivel === "nao_declarou") return "";
  switch (p.origem) {
    case "candidatura":
      return "anúncio da candidatura";
    case "partido":
    case "bancada":
    case "federacao":
      return PARTY_SOURCES[p.origem];
    case "senador":
      if (p.fonte.tipo === "candidatura") return "anúncio da candidatura"; // unreachable: only a candidacy carries it
      return p.nivel === "apoio_mapeado" ? MAPPED_SOURCE_TYPES[p.fonte.tipo] : SOURCE_TYPES[p.fonte.tipo];
  }
}

/** A declaration's excerpt as shown on the page: the senator's literal words, inside quotation marks. */
export const quoted = (trecho: string): string => `“${trecho}”`;

export const sourceTypeLabel = (tipo: FonteTipo): string => SOURCE_TYPES[tipo];

// The next word may start right after a tag ("em <a>um link</a>"), hence the end of a text run.
const SHORT_WORD = /(?<=^|\s)(a|o|e|à|ao|aos|as|os|às|de|da|do|das|dos|em|no|na|nos|nas|um|uma)\s+(?=\S|$)/giu;

/**
 * Ties a short preposition, article or conjunction to the next word with a no-break space,
 * so none ends a line. Works on rendered HTML: only text between tags is touched.
 */
export function tieShortWords(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith("<") ? part : part.replace(SHORT_WORD, "$1\u00a0")))
    .join("");
}

/** `https://www.instagram.com/marciobittar_` → `@marciobittar_` */
export function profileHandle(url: string): string {
  return `@${new URL(url).pathname.split("/").filter(Boolean)[0]}`;
}
