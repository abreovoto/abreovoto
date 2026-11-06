// Writes the initial data/senadores.yaml from the Senate's open-data API:
// every titular of a 2023-2031 or 2027-2035 mandate, all as nao_declarou.
// Refuses to touch an existing file: after the first run the YAML is edited
// by hand, and the API is only a starting point.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { stringify } from "yaml";
import { todayUtc, UF, type Senador } from "../src/data/schema";
import { slugify } from "../src/data/slug";
import { type ApiSenador, fetchAtual, fetchLegislatura, mergeUnique, parseAtual, parseLegislatura } from "./senado-api";

const OUTPUT = "data/senadores.yaml";

/** http:// photo URLs from the API, served over https by the same host. */
function toHttps(url: string | null): string | null {
  return url === null ? null : url.replace(/^http:\/\//, "https://");
}

/**
 * One entry per titular whose mandate starts in legislature 57 (vaga 3,
 * 2023-2031) or 58 (vagas 1 and 2 in the order encountered, 2027-2035).
 * Substitutes and older mandates are left out. Throws on anything that would
 * need a guess: an id collision, a UF with more titulars than seats, a
 * titular with no party.
 */
export function buildSeed(rows: ApiSenador[], today: string): Senador[] {
  const entries: Senador[] = [];
  const byId = new Map<string, ApiSenador>();
  const seats = new Map<string, ApiSenador>();

  for (const r of rows) {
    if (r.participacao !== "Titular") continue;
    if (r.legislaturaInicial !== 57 && r.legislaturaInicial !== 58) continue;

    const id = slugify(r.nome);
    const clash = byId.get(id);
    if (clash) throw new Error(`id "${id}" repetido: ${clash.nome} (${clash.codigo}) e ${r.nome} (${r.codigo})`);
    byId.set(id, r);

    if (r.partido === null) throw new Error(`${r.nome} (${r.codigo}) não tem partido na API`);

    const candidates = r.legislaturaInicial === 57 ? ([3] as const) : ([1, 2] as const);
    const vaga = candidates.find((v) => !seats.has(`${r.uf}/${v}`));
    if (vaga === undefined) {
      const holders = candidates.map((v) => seats.get(`${r.uf}/${v}`)?.nome).join(", ");
      throw new Error(`${r.uf}: mais titulares que vagas (${holders}, ${r.nome})`);
    }
    seats.set(`${r.uf}/${vaga}`, r);

    const foto = toHttps(r.fotoUrl);
    entries.push({
      id,
      nome: r.nome,
      nome_completo: r.nomeCompleto,
      apelido: null,
      partido: r.partido,
      uf: r.uf,
      vaga,
      mandato: vaga === 3 ? "2023-2031" : "2027-2035",
      situacao: "em_exercicio",
      assume_em: null,
      deixou_em: null,
      substituido_por: null,
      codigo_senado: r.codigo,
      codigo_camara: null,
      foto_origem: foto,
      foto_credito: foto === null ? null : "Agência Senado",
      redes: { x: null, instagram: null },
      email_institucional: r.email,
      declaracao: { status: "nao_declarou", candidato: null, data: null, fonte: null },
      observacoes: [],
      historico: [{ data: today, evento: "criado como nao_declarou", issue: null }],
    });
  }
  return entries;
}

/**
 * The vaga-3 entries whose titular is not in office today: their codigo is
 * absent from lista/atual while lista/atual has someone else in exercise for
 * a mandate of the same UF starting in legislature 57 (typically a
 * substitute). Their situacao is left as seeded; a person checks each one.
 */
export function incumbencyWarnings(entries: Senador[], atual: ApiSenador[]): string[] {
  const inOffice = new Set(atual.map((r) => r.codigo));
  return entries.flatMap((e) => {
    if (e.vaga !== 3 || e.codigo_senado === null || inOffice.has(e.codigo_senado)) return [];
    return atual
      .filter((r) => r.uf === e.uf && r.legislaturaInicial === 57)
      .map(
        (r) =>
          `${e.uf} vaga 3: ${e.nome} é titular, mas quem está em exercício é ${r.nome} (${r.participacao}) — confira antes de publicar`,
      );
  });
}

/** Every "UF/vaga" pair (27 × 3) that no entry occupies, in UF order. */
export function missingSeats(entries: Senador[]): string[] {
  const taken = new Set(entries.map((e) => `${e.uf}/${e.vaga}`));
  return UF.options.flatMap((uf) => [1, 2, 3].map((v) => `${uf}/${v}`)).filter((k) => !taken.has(k));
}

async function main(): Promise<number> {
  if (existsSync(OUTPUT)) {
    console.error(`seed: ${OUTPUT} já existe; nada foi alterado`);
    return 1;
  }
  const atual = parseAtual(await fetchAtual());
  const leg58 = parseLegislatura(await fetchLegislatura(58), 58);
  const entries = buildSeed(mergeUnique([atual, leg58]), todayUtc());

  mkdirSync("data", { recursive: true });
  writeFileSync(OUTPUT, stringify(entries, { lineWidth: 0 }));
  console.log(`seed: ${entries.length} senadores escritos em ${OUTPUT}`);

  const missing = missingSeats(entries);
  console.log(`seed: ${missing.length} vaga(s) sem ocupante: ${missing.join(" ")}`);
  for (const warning of incumbencyWarnings(entries, atual)) console.log(`seed: atenção: ${warning}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
