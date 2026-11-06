import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import {
  CandidatoSchema,
  PeticaoSchema,
  SenadorSchema,
  SiteSchema,
  todayUtc,
  UF,
  type Candidato,
  type Peticao,
  type Senador,
  type Site,
} from "./schema";

export type Dataset = { senadores: Senador[]; candidatos: Candidato[]; peticao: Peticao; site: Site };

/** Every problem found in the data, one human-readable line each. */
export class DataError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`dados inválidos:\n${issues.join("\n")}`);
    this.name = "DataError";
    this.issues = issues;
  }
}

export type LoadOptions = {
  /** Directory holding the YAML files. Relative paths resolve against the working directory. */
  dir?: string;
  /** Directory holding `senadores/<id>.jpg` and `candidatos/<id>.jpg`. */
  assetsDir?: string;
  /** Reference date (YYYY-MM-DD) no recorded date may exceed. Defaults to today in UTC. */
  today?: string;
};

const ELECTION_DATE = "2027-02-01";
const SEATS_PER_UF = [1, 2, 3] as const;
const SEATS_TOTAL = UF.options.length * SEATS_PER_UF.length;

const SENADORES = "senadores.yaml";
const CANDIDATOS = "candidatos.yaml";
const PETICAO = "peticao.yaml";
const SITE = "site.yaml";

const localeError = z.locales.ptBR().localeError;

function line(file: string, id: string | null, message: string): string {
  return id ? `${file} [${id}]: ${message}` : `${file}: ${message}`;
}

function zodMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    return `chave desconhecida ${issue.keys.map((k) => `"${k}"`).join(", ")}`;
  }
  return issue.message;
}

/** Read and schema-check one file; returns the parsed value, or null after recording its issues. */
function readFile<T>(dir: string, file: string, schema: z.ZodType<T>, issues: string[]): T | null {
  const path = join(dir, file);
  if (!existsSync(path)) {
    issues.push(line(file, null, `arquivo não encontrado em ${path}`));
    return null;
  }
  let raw: unknown;
  try {
    raw = parse(readFileSync(path, "utf8"));
  } catch (e) {
    issues.push(line(file, null, `YAML inválido: ${(e as Error).message.split("\n")[0]}`));
    return null;
  }
  const result = schema.safeParse(raw, { error: localeError });
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    let path = issue.path;
    let id: string | null = null;
    if (Array.isArray(raw) && typeof path[0] === "number") {
      const entry = raw[path[0]] as { id?: unknown } | null;
      id = typeof entry?.id === "string" ? entry.id : `#${path[0] + 1}`;
      path = path.slice(1);
    }
    const where = path.length > 0 ? `${path.join(".")}: ` : "";
    issues.push(line(file, id, `${where}${zodMessage(issue)}`));
  }
  return null;
}

// Cross-checks, in the order their issues are reported.

function uniqueIds(file: string, entries: { id: string }[]): string[] {
  const seen = new Set<string>();
  const issues: string[] = [];
  for (const { id } of entries) {
    if (seen.has(id)) issues.push(line(file, id, "id repetido"));
    seen.add(id);
  }
  return issues;
}

function seatsFilled(senadores: Senador[]): string[] {
  const issues: string[] = [];
  const active = senadores.filter((s) => s.situacao === "em_exercicio");
  if (active.length !== SEATS_TOTAL) {
    issues.push(line(SENADORES, null, `${active.length} senadores em exercício (esperado ${SEATS_TOTAL})`));
  }
  for (const uf of UF.options) {
    for (const vaga of SEATS_PER_UF) {
      const n = active.filter((s) => s.uf === uf && s.vaga === vaga).length;
      if (n !== 1) issues.push(line(SENADORES, null, `${uf} vaga ${vaga} tem ${n} senadores em exercício (esperado 1)`));
    }
  }
  return issues;
}

function mandatoMatchesVaga(senadores: Senador[]): string[] {
  return senadores.flatMap((s) => {
    const expected = s.vaga === 3 ? "2023-2031" : "2027-2035";
    return s.mandato === expected
      ? []
      : [line(SENADORES, s.id, `mandato ${s.mandato} não corresponde à vaga ${s.vaga} (esperado ${expected})`)];
  });
}

function departures(senadores: Senador[]): string[] {
  const byId = new Map(senadores.map((s) => [s.id, s]));
  return senadores.flatMap((s) => {
    const issues: string[] = [];
    if (s.situacao === "em_exercicio") {
      if (s.deixou_em !== null) issues.push(line(SENADORES, s.id, "deixou_em precisa ser null para quem está em exercício"));
      if (s.substituido_por !== null) issues.push(line(SENADORES, s.id, "substituido_por precisa ser null para quem está em exercício"));
      return issues;
    }
    if (s.deixou_em === null) issues.push(line(SENADORES, s.id, "deixou_em é obrigatório para quem deixou o mandato"));
    if (s.substituido_por === null) {
      issues.push(line(SENADORES, s.id, "substituido_por é obrigatório para quem deixou o mandato"));
    } else {
      const successor = byId.get(s.substituido_por);
      if (!successor) {
        issues.push(line(SENADORES, s.id, `substituido_por "${s.substituido_por}" não está em ${SENADORES}`));
      } else if (successor.situacao !== "em_exercicio") {
        issues.push(line(SENADORES, s.id, `substituido_por "${s.substituido_por}" não está em exercício`));
      }
    }
    return issues;
  });
}

function declaredCandidates(senadores: Senador[], candidatos: Candidato[]): string[] {
  const byId = new Map(candidatos.map((c) => [c.id, c]));
  return senadores.flatMap((s) => {
    const id = s.declaracao.candidato;
    if (id === null) return [];
    const candidate = byId.get(id);
    if (!candidate) return [line(SENADORES, s.id, `declaracao.candidato "${id}" não está em ${CANDIDATOS}`)];
    if (candidate.situacao === "desistiu") {
      return [
        line(
          SENADORES,
          s.id,
          `candidato ${id} desistiu em ${candidate.desistiu_em ?? "data não informada"}; volte a declaração para nao_declarou e registre uma observação`,
        ),
      ];
    }
    return [];
  });
}

function candidateSeats(senadores: Senador[], candidatos: Candidato[]): string[] {
  const byId = new Map(senadores.map((s) => [s.id, s]));
  return candidatos.flatMap((c) => {
    const seat = byId.get(c.senador);
    if (!seat) return [line(CANDIDATOS, c.id, `senador "${c.senador}" não está em ${SENADORES}`)];
    // A candidate's own seat states its vote for them; showing it in session also counts.
    const declares = seat.declaracao.status !== "nao_declarou" && seat.declaracao.candidato === c.id;
    if (c.situacao === "candidato" && !declares) {
      return [line(CANDIDATOS, c.id, `o senador ${c.senador} precisa ter declaração para ${c.id}`)];
    }
    return [];
  });
}

function withdrawals(candidatos: Candidato[]): string[] {
  return candidatos.flatMap((c) => {
    if (c.situacao === "desistiu" && c.desistiu_em === null) {
      return [line(CANDIDATOS, c.id, "desistiu_em é obrigatório quando situacao é desistiu")];
    }
    if (c.situacao === "candidato" && c.desistiu_em !== null) {
      return [line(CANDIDATOS, c.id, "desistiu_em precisa ser null quando situacao é candidato")];
    }
    return [];
  });
}

function photos(file: string, folder: string, entries: { id: string; foto_credito: string | null }[], required: (id: string) => boolean): string[] {
  return entries.flatMap((e) => {
    const path = join(folder, `${e.id}.jpg`);
    const exists = existsSync(path);
    if (!exists && required(e.id)) return [line(file, e.id, `foto não encontrada em ${path}`)];
    if (exists && e.foto_credito === null) return [line(file, e.id, `foto em ${path} sem foto_credito`)];
    return [];
  });
}

function historyPresent(senadores: Senador[]): string[] {
  return senadores.flatMap((s) =>
    s.historico.length > 0 ? [] : [line(SENADORES, s.id, "historico vazio (registre ao menos o evento de criação)")],
  );
}

function electionDate(site: Site): string[] {
  return site.eleicao === ELECTION_DATE ? [] : [line(SITE, null, `eleicao precisa ser ${ELECTION_DATE} (encontrado ${site.eleicao})`)];
}

function notAfter(today: string, file: string, id: string, dates: [string, string | null][]): string[] {
  return dates.flatMap(([field, value]) =>
    value !== null && value > today ? [line(file, id, `${field} ${value} é posterior a hoje (${today})`)] : [],
  );
}

function datesNotAfterToday(today: string, senadores: Senador[] | null, candidatos: Candidato[] | null): string[] {
  const issues: string[] = [];
  for (const s of senadores ?? []) {
    issues.push(
      ...notAfter(today, SENADORES, s.id, [
        ["declaracao.data", s.declaracao.data],
        ["deixou_em", s.deixou_em],
        ...s.observacoes.map((o, i): [string, string] => [`observacoes.${i}.data`, o.data]),
        ...s.historico.map((h, i): [string, string] => [`historico.${i}.data`, h.data]),
      ]),
    );
  }
  for (const c of candidatos ?? []) {
    issues.push(...notAfter(today, CANDIDATOS, c.id, [["desde", c.desde], ["desistiu_em", c.desistiu_em]]));
  }
  return issues;
}

/**
 * Read the four data files, check them against the schemas and against each
 * other, and return the dataset. Throws one `DataError` carrying every issue.
 * Cross-checks run only on the files that passed their schema.
 */
export function loadData(opts: LoadOptions = {}): Dataset {
  const dir = opts.dir ?? "data";
  const assetsDir = opts.assetsDir ?? join("src", "assets", "fotos");
  const today = opts.today ?? todayUtc();

  const issues: string[] = [];
  const senadores = readFile(dir, SENADORES, z.array(SenadorSchema), issues);
  const candidatos = readFile(dir, CANDIDATOS, z.array(CandidatoSchema), issues);
  const peticao = readFile(dir, PETICAO, PeticaoSchema, issues);
  const site = readFile(dir, SITE, SiteSchema, issues);

  if (senadores) issues.push(...uniqueIds(SENADORES, senadores));
  if (candidatos) issues.push(...uniqueIds(CANDIDATOS, candidatos));
  if (senadores) {
    issues.push(...seatsFilled(senadores), ...mandatoMatchesVaga(senadores), ...departures(senadores));
  }
  if (senadores && candidatos) {
    issues.push(...declaredCandidates(senadores, candidatos), ...candidateSeats(senadores, candidatos));
  }
  if (candidatos) issues.push(...withdrawals(candidatos));
  if (senadores) {
    const active = new Set(senadores.filter((s) => s.situacao === "em_exercicio").map((s) => s.id));
    issues.push(...photos(SENADORES, join(assetsDir, "senadores"), senadores, (id) => active.has(id)));
  }
  if (candidatos) issues.push(...photos(CANDIDATOS, join(assetsDir, "candidatos"), candidatos, () => true));
  if (senadores) issues.push(...historyPresent(senadores));
  // contagem_manual >= 0 is enforced by PeticaoSchema itself.
  if (site) issues.push(...electionDate(site));
  issues.push(...datesNotAfterToday(today, senadores, candidatos));

  if (issues.length > 0 || !senadores || !candidatos || !peticao || !site) throw new DataError(issues);
  return { senadores, candidatos, peticao, site };
}

/** The 81 current seat holders. */
export function emExercicio(d: Dataset): Senador[] {
  return d.senadores.filter((s) => s.situacao === "em_exercicio");
}
