import { z } from "zod";

// Every object schema is strict: an unknown key (a typo in the YAML) fails.

const BLOCKED_HOSTS = ["wa.me", "chat.whatsapp.com", "api.whatsapp.com"];

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

/** A public link: parses as a URL, uses https, and is not a WhatsApp link. */
export const httpsUrl = z.string().refine(
  (value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    return url.protocol === "https:" && !isBlockedHost(url.hostname);
  },
  { message: "precisa ser um link https público (links de WhatsApp não são aceitos)" },
);

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True when `value` is YYYY-MM-DD and names a real calendar day. */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today's date in UTC as YYYY-MM-DD. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A calendar date as YYYY-MM-DD, with no constraint on when it falls. */
export const isoDate = z
  .string()
  .refine(isValidIsoDate, { message: "precisa ser uma data válida no formato AAAA-MM-DD" });

/** A calendar date as YYYY-MM-DD that is not later than today (UTC). */
export const isoDateNotFuture = isoDate.refine((value) => value <= todayUtc(), {
  message: "a data não pode estar no futuro",
});

const text = z.string().regex(/\S/, { message: "não pode ser vazio" });
const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "precisa ser um identificador em minúsculas, com hífens" });
const email = z.email({ message: "precisa ser um e-mail válido" });

export const UF = z.enum([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export const FonteTipo = z.enum(["video", "post", "materia", "nota", "email_institucional"]);

export const Status = z.enum(["nao_declarou", "declarou", "mostrou_na_sessao"]);

export const FonteSchema = z.strictObject({
  tipo: FonteTipo,
  url: httpsUrl,
  titulo: text.nullable(),
  trecho: text,
});

const DeclaracaoComFonte = {
  candidato: id,
  data: isoDateNotFuture,
  fonte: FonteSchema,
};

export const DeclaracaoSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("nao_declarou"),
    candidato: z.null(),
    data: z.null(),
    fonte: z.null(),
  }),
  z.strictObject({ status: z.literal("declarou"), ...DeclaracaoComFonte }),
  z.strictObject({ status: z.literal("mostrou_na_sessao"), ...DeclaracaoComFonte }),
]);

export const ObservacaoSchema = z.strictObject({
  data: isoDateNotFuture,
  texto: text,
  fonte_url: httpsUrl,
});

export const HistoricoSchema = z.strictObject({
  data: isoDateNotFuture,
  evento: text,
  issue: z.number().int().positive().nullable(),
});

export const SenadorSchema = z.strictObject({
  id,
  nome: text,
  nome_completo: text.nullable(),
  apelido: text.nullable(),
  partido: text,
  uf: UF,
  vaga: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  mandato: z.enum(["2023-2031", "2027-2035"]),
  situacao: z.enum(["em_exercicio", "deixou_mandato"]),
  deixou_em: isoDateNotFuture.nullable(),
  substituido_por: id.nullable(),
  codigo_senado: text.nullable(),
  codigo_camara: text.nullable(),
  foto_origem: httpsUrl.nullable(),
  foto_credito: text.nullable(),
  redes: z.strictObject({
    x: httpsUrl.nullable(),
    instagram: httpsUrl.nullable(),
  }),
  email_institucional: email.nullable(),
  declaracao: DeclaracaoSchema,
  observacoes: z.array(ObservacaoSchema),
  historico: z.array(HistoricoSchema),
});

export const CandidatoSchema = z.strictObject({
  id,
  nome: text,
  partido: text,
  uf: UF,
  senador: id,
  foto_origem: httpsUrl.nullable(),
  foto_credito: text.nullable(),
  situacao: z.enum(["candidato", "desistiu"]),
  desde: isoDateNotFuture,
  desistiu_em: isoDateNotFuture.nullable(),
  fonte: httpsUrl,
});

export const PeticaoSchema = z.strictObject({
  url: httpsUrl.nullable(),
  meta: z.number().int().nonnegative(),
  contagem_manual: z.number().int().nonnegative(),
});

export const SiteSchema = z.strictObject({
  dominio: text,
  eleicao: isoDate,
  hashtag: text,
  contato: email,
  repositorio: httpsUrl,
  ecidadania_url: httpsUrl.nullable(),
  /** The initiative's own profiles (not the senators'). */
  redes: z.strictObject({
    instagram: httpsUrl.nullable(),
    x: httpsUrl.nullable(),
    tiktok: httpsUrl.nullable(),
    youtube: httpsUrl.nullable(),
  }),
});

export type UF = z.infer<typeof UF>;
export type FonteTipo = z.infer<typeof FonteTipo>;
export type Status = z.infer<typeof Status>;
export type Fonte = z.infer<typeof FonteSchema>;
export type Declaracao = z.infer<typeof DeclaracaoSchema>;
export type Observacao = z.infer<typeof ObservacaoSchema>;
export type Historico = z.infer<typeof HistoricoSchema>;
export type Senador = z.infer<typeof SenadorSchema>;
export type Candidato = z.infer<typeof CandidatoSchema>;
export type Peticao = z.infer<typeof PeticaoSchema>;
export type Site = z.infer<typeof SiteSchema>;
