/**
 * The pure half of POST /api/fonte: what a submission must look like, and the public record it
 * becomes. Imports nothing from src/: the Worker bundle stays self-contained.
 */

/** `senador` is a seat holder's id or the literal "site". */
export type Submission = { senador: string; url: string; comentario: string; correcao: boolean; token: string };

export type FieldError = { campo: "senador" | "url" | "comentario" | "token" | "corpo" };

export const LIMITS = { body: 8192, url: 2000, comentario: 1000, token: 2048 } as const;

export type Seat = { id: string; nome: string; partido: string; uf: string; pagina: string };

/** The page's mail subject for the same case is the same string (a test holds them equal). */
export const CORRECAO_TITLE = "Correção: site";

const TRUE = new Set<unknown>([true, "true", "on", "1"]);

/**
 * An https URL written out in full, returned normalized: the parser percent-encodes `<`, `>`,
 * backticks and quotes, so the address can sit inside an autolink in the public record.
 */
function validUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (url.length > LIMITS.url || /\s/.test(url) || !/^https:\/\//i.test(url)) return null;
  try {
    const href = new URL(url).href;
    return href.length > LIMITS.url ? null : href;
  } catch {
    return null;
  }
}

/** Checked in the order senador, url, comentario, token; the first failure wins. */
export function parseSubmission(raw: Record<string, unknown>, knownIds: ReadonlySet<string>): Submission | FieldError {
  const { senador, comentario = "", correcao, token } = raw;
  if (typeof senador !== "string" || (senador !== "site" && !knownIds.has(senador))) return { campo: "senador" };
  const url = validUrl(raw.url);
  if (url === null) return { campo: "url" };
  if (typeof comentario !== "string" || comentario.trim().length > LIMITS.comentario) return { campo: "comentario" };
  if (typeof token !== "string" || token === "" || token.length > LIMITS.token) return { campo: "token" };
  return { senador, url, comentario: comentario.trim(), correcao: TRUE.has(correcao), token };
}

/** A backtick fence one longer than the longest backtick run in the text, three at least. */
export const fence = (text: string): string => {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
};

/** `seat` is null iff the submission is about the site itself. */
export function issueFor(s: Submission, seat: Seat | null, at: Date): { title: string; body: string; labels: ["data"] } {
  const when = at.toISOString().slice(0, 16).replace("T", " ");
  const paragraphs = [
    `Enviado pelo formulário do site em ${when} UTC. **Não verificado**: só entra no placar depois da regra da [Metodologia](https://abreovoto.com/metodologia/).`,
    seat === null ? "Sobre: o site" : `Senador(a): [${seat.nome}](${seat.pagina})`,
    // An autolink: GitHub renders the address and processes no mention inside it.
    `Fonte: <${s.url}>`,
    `Correção do que o site mostra: ${s.correcao ? "sim" : "não"}`,
  ];
  if (s.comentario !== "") {
    const f = fence(s.comentario);
    paragraphs.push(`Comentário:\n${f}\n${s.comentario}\n${f}`);
  }
  return {
    title: seat === null ? CORRECAO_TITLE : `Fonte enviada: ${seat.nome} (${seat.partido}-${seat.uf})`,
    body: paragraphs.join("\n\n"),
    labels: ["data"],
  };
}
