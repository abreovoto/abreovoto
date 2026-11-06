// Reads the Brazilian Senate's open-data API (dadosabertos) and maps its
// parliamentarian lists to a flat row per person.
import { z } from "zod";
import { UF } from "../src/data/schema";

const BASE = "https://legis.senado.leg.br/dadosabertos";

export type Participacao = "Titular" | "1º Suplente" | "2º Suplente";

export type ApiSenador = {
  codigo: string;
  nome: string;
  nomeCompleto: string | null;
  /** Null when the API lists no party (it happens for some substitutes). */
  partido: string | null;
  uf: UF;
  /** The photo URL exactly as the API gives it (usually http://). */
  fotoUrl: string | null;
  email: string | null;
  /** Number of the first legislature of the mandate: 57 ⇒ 2023-2031, 58 ⇒ 2027-2035. */
  legislaturaInicial: number;
  participacao: Participacao;
};

// The API's XML-to-JSON conversion turns a one-element list into a bare object.
function oneOrMany<T extends z.ZodType>(item: T) {
  return z.union([item, z.array(item)]).transform((v) => (Array.isArray(v) ? v : [v]) as z.infer<T>[]);
}

const Identificacao = z.looseObject({
  CodigoParlamentar: z.string(),
  NomeParlamentar: z.string(),
  NomeCompletoParlamentar: z.string().optional(),
  SiglaPartidoParlamentar: z.string().optional(),
  UfParlamentar: z.string().optional(),
  UrlFotoParlamentar: z.string().optional(),
  EmailParlamentar: z.string().optional(),
});

const Mandato = z.looseObject({
  UfParlamentar: UF,
  PrimeiraLegislaturaDoMandato: z.looseObject({ NumeroLegislatura: z.coerce.number().int() }),
  SegundaLegislaturaDoMandato: z.looseObject({ NumeroLegislatura: z.coerce.number().int() }).optional(),
  DescricaoParticipacao: z.enum(["Titular", "1º Suplente", "2º Suplente"]),
});

const AtualResponse = z.looseObject({
  ListaParlamentarEmExercicio: z.looseObject({
    Parlamentares: z.looseObject({
      Parlamentar: oneOrMany(z.looseObject({ IdentificacaoParlamentar: Identificacao, Mandato })),
    }),
  }),
});

const LegislaturaResponse = z.looseObject({
  ListaParlamentarLegislatura: z.looseObject({
    Parlamentares: z.looseObject({
      Parlamentar: oneOrMany(
        z.looseObject({
          IdentificacaoParlamentar: Identificacao,
          Mandatos: z.looseObject({ Mandato: oneOrMany(Mandato) }),
        }),
      ),
    }),
  }),
});

function toRow(id: z.infer<typeof Identificacao>, m: z.infer<typeof Mandato>): ApiSenador {
  return {
    codigo: id.CodigoParlamentar,
    nome: id.NomeParlamentar,
    nomeCompleto: id.NomeCompletoParlamentar ?? null,
    partido: id.SiglaPartidoParlamentar ?? null,
    uf: m.UfParlamentar,
    fotoUrl: id.UrlFotoParlamentar ?? null,
    email: id.EmailParlamentar ?? null,
    legislaturaInicial: m.PrimeiraLegislaturaDoMandato.NumeroLegislatura,
    participacao: m.DescricaoParticipacao,
  };
}

/** Rows of `senador/lista/atual`: the parliamentarians in office today. */
export function parseAtual(json: unknown): ApiSenador[] {
  const parsed = AtualResponse.parse(json);
  return parsed.ListaParlamentarEmExercicio.Parlamentares.Parlamentar.map((p) =>
    toRow(p.IdentificacaoParlamentar, p.Mandato),
  );
}

/**
 * Rows of `senador/lista/legislatura/{n}`. Each person is listed with the
 * mandate that spans legislature `n` (as its first or second legislature);
 * a mandate that starts in `n` is preferred.
 */
export function parseLegislatura(json: unknown, legislatura: number): ApiSenador[] {
  const parsed = LegislaturaResponse.parse(json);
  return parsed.ListaParlamentarLegislatura.Parlamentares.Parlamentar.map((p) => {
    const mandatos = p.Mandatos.Mandato;
    const mandato =
      mandatos.find((m) => m.PrimeiraLegislaturaDoMandato.NumeroLegislatura === legislatura) ??
      mandatos.find((m) => m.SegundaLegislaturaDoMandato?.NumeroLegislatura === legislatura);
    if (!mandato) {
      throw new Error(`parlamentar ${p.IdentificacaoParlamentar.CodigoParlamentar} sem mandato na legislatura ${legislatura}`);
    }
    return toRow(p.IdentificacaoParlamentar, mandato);
  });
}

/**
 * One row per `codigo`. A Titular row wins over a substitute row of the same
 * person; between rows of equal participation, the row from the LATER list
 * wins (pass `[atual, legislatura]` so the legislature list decides party,
 * UF, first legislature and participation). Party, photo, e-mail and full
 * name missing from the winner are filled from the other rows.
 */
export function mergeUnique(lists: ApiSenador[][]): ApiSenador[] {
  const byCodigo = new Map<string, ApiSenador>();
  for (const row of lists.flat()) {
    const prev = byCodigo.get(row.codigo);
    if (!prev) {
      byCodigo.set(row.codigo, row);
      continue;
    }
    const rowWins = row.participacao === "Titular" || prev.participacao !== "Titular";
    const [winner, loser] = rowWins ? [row, prev] : [prev, row];
    byCodigo.set(row.codigo, {
      ...winner,
      partido: winner.partido ?? loser.partido,
      fotoUrl: winner.fotoUrl ?? loser.fotoUrl,
      email: winner.email ?? loser.email,
      nomeCompleto: winner.nomeCompleto ?? loser.nomeCompleto,
    });
  }
  return [...byCodigo.values()];
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${BASE}${path}: HTTP ${res.status}`);
  return res.json();
}

export function fetchAtual(): Promise<unknown> {
  return getJson("/senador/lista/atual");
}

export function fetchLegislatura(n: number): Promise<unknown> {
  return getJson(`/senador/lista/legislatura/${n}`);
}
