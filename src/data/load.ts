import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import {
  CandidatoSchema,
  PartidoApoioSchema,
  PeticaoSchema,
  SenadorSchema,
  SiteSchema,
  todayUtc,
  UF,
  type Candidato,
  type PartidoApoio,
  type Peticao,
  type Senador,
  type Site,
} from "./schema";

export type Dataset = {
  senadores: Senador[];
  candidatos: Candidato[];
  partidos: PartidoApoio[];
  peticao: Peticao;
  site: Site;
};

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
const PARTIDOS = "partidos.yaml";
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

/** Follow `substituido_por` from `start` (a seat can change hands more than once) until someone in office. */
function reachesOffice(start: Senador, byId: Map<string, Senador>): boolean {
  const seen = new Set<string>();
  let current: Senador | undefined = start;
  while (current && !seen.has(current.id)) {
    if (current.situacao === "em_exercicio") return true;
    seen.add(current.id);
    current = current.substituido_por === null ? undefined : byId.get(current.substituido_por);
  }
  return false;
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
      } else if (successor.uf !== s.uf || successor.vaga !== s.vaga) {
        issues.push(
          line(SENADORES, s.id, `substituido_por "${successor.id}" ocupa ${successor.uf} vaga ${successor.vaga}, não ${s.uf} vaga ${s.vaga}`),
        );
      } else if (!reachesOffice(successor, byId)) {
        issues.push(line(SENADORES, s.id, `a cadeia de substituido_por a partir de "${successor.id}" não termina em alguém em exercício`));
      }
    }
    return issues;
  });
}

/** `assume_em` belongs to someone in office whose predecessor leaves on that same date. */
function scheduledSuccessions(senadores: Senador[]): string[] {
  return senadores.flatMap((s) => {
    if (s.assume_em === null) return [];
    if (s.situacao !== "em_exercicio") return [line(SENADORES, s.id, "assume_em só vale para quem está em exercício")];
    const predecessor = senadores.find((p) => p.substituido_por === s.id && p.deixou_em === s.assume_em);
    return predecessor
      ? []
      : [line(SENADORES, s.id, `assume_em ${s.assume_em} sem um antecessor que deixe a vaga nessa data (deixou_em e substituido_por)`)];
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

function candidateSenators(senadores: Senador[], candidatos: Candidato[]): string[] {
  const byId = new Map(senadores.map((s) => [s.id, s]));
  return candidatos.flatMap((c) => {
    const senator = byId.get(c.senador);
    if (!senator) return [line(CANDIDATOS, c.id, `senador "${c.senador}" não está em ${SENADORES}`)];
    // The candidate repeats the senator's party and UF; the two files must not drift apart.
    const issues: string[] = [];
    if (c.partido !== senator.partido) {
      issues.push(line(CANDIDATOS, c.id, `partido ${c.partido} difere do registro do senador ${senator.id} (${senator.partido})`));
    }
    if (c.uf !== senator.uf) {
      issues.push(line(CANDIDATOS, c.id, `uf ${c.uf} difere do registro do senador ${senator.id} (${senator.uf})`));
    }
    return issues;
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

/** The announcement in effect for `partido`: the one with the latest `data`, or null when it has none. */
export function partidoVigente(partidos: PartidoApoio[], partido: string): PartidoApoio | null {
  let current: PartidoApoio | null = null;
  for (const p of partidos) {
    if (p.partido === partido && (current === null || p.data > current.data)) current = p;
  }
  return current;
}

function partyEntries(partidos: PartidoApoio[], senadores: Senador[], candidatos: Candidato[]): string[] {
  const inOffice = new Set(senadores.filter((s) => s.situacao === "em_exercicio").map((s) => s.partido));
  const byId = new Map(candidatos.map((c) => [c.id, c]));
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const p of partidos) {
    if (!inOffice.has(p.partido)) issues.push(line(PARTIDOS, p.id, `partido "${p.partido}" não tem senadores em exercício`));
    if (p.candidato !== null && !byId.has(p.candidato)) {
      issues.push(line(PARTIDOS, p.id, `candidato "${p.candidato}" não está em ${CANDIDATOS}`));
    }
    // Two entries on one date would make the one in effect depend on file order.
    const key = `${p.partido}\u0000${p.data}`;
    if (seen.has(key)) issues.push(line(PARTIDOS, p.id, `outra entrada para ${p.partido} na mesma data (${p.data})`));
    seen.add(key);
  }
  // Only the entry in effect is checked against withdrawals; superseded ones are history.
  for (const partido of new Set(partidos.map((p) => p.partido))) {
    const current = partidoVigente(partidos, partido);
    const candidate = current?.candidato ? byId.get(current.candidato) : undefined;
    if (current && candidate?.situacao === "desistiu") {
      issues.push(
        line(
          PARTIDOS,
          current.id,
          `candidato ${candidate.id} desistiu em ${candidate.desistiu_em ?? "data não informada"}; registre uma nova entrada para ${partido} (candidato null se o partido não anunciou outro)`,
        ),
      );
    }
  }
  return issues;
}

/** A running candidate is already mapped support for themselves; a stored `apoio_mapeado` there would never show. */
function storedMappedOnCandidates(senadores: Senador[], candidatos: Candidato[]): string[] {
  const running = new Set(candidatos.filter((c) => c.situacao === "candidato").map((c) => c.senador));
  return senadores.flatMap((s) =>
    s.declaracao.status === "apoio_mapeado" && running.has(s.id)
      ? [line(SENADORES, s.id, "apoio_mapeado não se registra na cadeira de um candidato em campanha (a candidatura já conta como apoio mapeado a si mesmo)")]
      : [],
  );
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

const RAW_TEXT = /_|\d{4}-\d{2}-\d{2}/;

/** Pages print history events and observations verbatim, so they must read as Portuguese, not as data. */
export function readableText(senadores: Senador[]): string[] {
  return senadores.flatMap((s) => {
    const fields: [string, string][] = [
      ...s.historico.map((h, i): [string, string] => [`historico.${i}.evento`, h.evento]),
      ...s.observacoes.map((o, i): [string, string] => [`observacoes.${i}.texto`, o.texto]),
    ];
    return fields
      .filter(([, value]) => RAW_TEXT.test(value))
      .map(([field, value]) => line(SENADORES, s.id, `texto não legível em ${field}: "${value.slice(0, 40)}"`));
  });
}

function electionDate(site: Site): string[] {
  return site.eleicao === ELECTION_DATE ? [] : [line(SITE, null, `eleicao precisa ser ${ELECTION_DATE} (encontrado ${site.eleicao})`)];
}

function notAfter(today: string, file: string, id: string, dates: [string, string | null][]): string[] {
  return dates.flatMap(([field, value]) =>
    value !== null && value > today ? [line(file, id, `${field} ${value} é posterior a hoje (${today})`)] : [],
  );
}

function datesNotAfterToday(
  today: string,
  senadores: Senador[] | null,
  candidatos: Candidato[] | null,
  partidos: PartidoApoio[] | null,
): string[] {
  const issues: string[] = [];
  const byId = new Map((senadores ?? []).map((s) => [s.id, s]));
  for (const s of senadores ?? []) {
    // A future departure is a scheduled one only when the successor takes the seat that same day.
    const scheduled = s.deixou_em !== null && s.substituido_por !== null && byId.get(s.substituido_por)?.assume_em === s.deixou_em;
    issues.push(
      ...notAfter(today, SENADORES, s.id, [
        ["declaracao.data", s.declaracao.data],
        ["recusa_partido.data", s.recusa_partido?.data ?? null],
        ["deixou_em", scheduled ? null : s.deixou_em],
        ...s.observacoes.map((o, i): [string, string] => [`observacoes.${i}.data`, o.data]),
        ...s.historico.map((h, i): [string, string] => [`historico.${i}.data`, h.data]),
      ]),
    );
  }
  for (const c of candidatos ?? []) {
    issues.push(...notAfter(today, CANDIDATOS, c.id, [["desde", c.desde], ["desistiu_em", c.desistiu_em]]));
  }
  for (const p of partidos ?? []) issues.push(...notAfter(today, PARTIDOS, p.id, [["data", p.data]]));
  return issues;
}

/**
 * Read the five data files, check them against the schemas and against each
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
  const partidos = readFile(dir, PARTIDOS, z.array(PartidoApoioSchema), issues);
  const peticao = readFile(dir, PETICAO, PeticaoSchema, issues);
  const site = readFile(dir, SITE, SiteSchema, issues);

  if (senadores) issues.push(...uniqueIds(SENADORES, senadores));
  if (candidatos) issues.push(...uniqueIds(CANDIDATOS, candidatos));
  if (partidos) issues.push(...uniqueIds(PARTIDOS, partidos));
  if (senadores) {
    issues.push(
      ...seatsFilled(senadores),
      ...mandatoMatchesVaga(senadores),
      ...departures(senadores),
      ...scheduledSuccessions(senadores),
    );
  }
  if (senadores && candidatos) {
    issues.push(
      ...declaredCandidates(senadores, candidatos),
      ...candidateSenators(senadores, candidatos),
      ...storedMappedOnCandidates(senadores, candidatos),
    );
    if (partidos) issues.push(...partyEntries(partidos, senadores, candidatos));
  }
  if (candidatos) issues.push(...withdrawals(candidatos));
  if (senadores) {
    const active = new Set(senadores.filter((s) => s.situacao === "em_exercicio").map((s) => s.id));
    issues.push(...photos(SENADORES, join(assetsDir, "senadores"), senadores, (id) => active.has(id)));
  }
  if (candidatos) issues.push(...photos(CANDIDATOS, join(assetsDir, "candidatos"), candidatos, () => true));
  if (senadores) issues.push(...historyPresent(senadores), ...readableText(senadores));
  // contagem_manual >= 0 is enforced by PeticaoSchema itself.
  if (site) issues.push(...electionDate(site));
  issues.push(...datesNotAfterToday(today, senadores, candidatos, partidos));

  if (issues.length > 0 || !senadores || !candidatos || !partidos || !peticao || !site) throw new DataError(issues);
  return { senadores, candidatos, partidos, peticao, site };
}

/** The 81 current seat holders. */
export function emExercicio(d: Dataset): Senador[] {
  return d.senadores.filter((s) => s.situacao === "em_exercicio");
}
