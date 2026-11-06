import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { UF } from "../../src/data/schema";

type Entry = Record<string, unknown>;
type Patch = Record<string, unknown>;

/**
 * Overrides applied to the minimal valid dataset. Each one changes a single
 * thing, so a test can name the rule it breaks.
 */
export type DatasetOverrides = {
  /** Move `<uf>-2` to vaga 1, so the UF has two occupants on vaga 1 and none on vaga 2. */
  duplicateVaga?: string;
  /** Add an 82nd `em_exercicio` entry (`ac-1-extra`, AC vaga 1). */
  extraSeat?: boolean;
  /** Mark the candidate as withdrawn (`situacao: desistiu`, `desistiu_em` set). */
  withdraw?: string;
  /** `[senatorId, candidateId]`, or a list of them: make the senator `declarou` for the candidate. */
  declareFor?: [string, string] | [string, string][];
  /** `[senatorId, candidateId]`: make the senator `mostrou_na_sessao` for the candidate. */
  shown?: [string, string];
  /**
   * `[oldId, newId]`: the old occupant leaves (`deixou_mandato`, replaced by `newId`) and a new
   * `em_exercicio` entry takes the same uf, vaga and mandato. Applied after `declareFor` and
   * `shown`, so a declaration set there stays with the former occupant.
   */
  replace?: [string, string];
  /** Do not write the photo file for this senator or candidate id. */
  dropPhoto?: string;
  /** Add a key the schema does not know to the `ac-1` entry. */
  extraKey?: boolean;
  /** Shallow patches merged into senator entries, by id. */
  senador?: Record<string, Patch>;
  /** Shallow patches merged into candidate entries, by id. */
  candidato?: Record<string, Patch>;
  /** Extra senator entries appended as given (use `senadorEntry` to build one). */
  extraSenadores?: Entry[];
  /** Shallow patch merged into `peticao.yaml`. */
  peticao?: Patch;
  /** Shallow patch merged into `site.yaml`. */
  site?: Patch;
};

export const FIXTURE_DATE = "2026-10-15";

const CANDIDATES = [
  { id: "alcolumbre", nome: "Davi Alcolumbre", partido: "UNIÃO", uf: "AP", senador: "ap-3" },
  { id: "marinho", nome: "Rogério Marinho", partido: "PL", uf: "RN", senador: "rn-3" },
  { id: "tereza-cristina", nome: "Tereza Cristina", partido: "PP", uf: "MS", senador: "ms-3" },
] as const;

export function declarou(candidato: string): Entry {
  return {
    status: "declarou",
    candidato,
    data: FIXTURE_DATE,
    fonte: {
      tipo: "materia",
      url: `https://www12.senado.leg.br/noticias/materias/2026/10/15/${candidato}`,
      titulo: null,
      trecho: "meu voto é declarado",
    },
  };
}

export function senadorEntry(id: string, uf: string, vaga: 1 | 2 | 3, nome = `Senador ${id.toUpperCase()}`): Entry {
  return {
    id,
    nome,
    nome_completo: null,
    apelido: null,
    partido: "PARTIDO",
    uf,
    vaga,
    mandato: vaga === 3 ? "2023-2031" : "2027-2035",
    situacao: "em_exercicio",
    assume_em: null,
    deixou_em: null,
    substituido_por: null,
    codigo_senado: null,
    codigo_camara: null,
    foto_origem: null,
    foto_credito: "Agência Senado",
    redes: { x: null, instagram: null },
    email_institucional: null,
    declaracao: { status: "nao_declarou", candidato: null, data: null, fonte: null },
    observacoes: [],
    historico: [{ data: FIXTURE_DATE, evento: "entrou na lista como não declarou", issue: null }],
  };
}

function baseSenadores(): Entry[] {
  const entries: Entry[] = [];
  for (const uf of UF.options) {
    for (const vaga of [1, 2, 3] as const) {
      const id = `${uf.toLowerCase()}-${vaga}`;
      const candidate = CANDIDATES.find((c) => c.senador === id);
      const entry = senadorEntry(id, uf, vaga, candidate?.nome);
      if (candidate) {
        entry.partido = candidate.partido;
        entry.declaracao = declarou(candidate.id);
      }
      entries.push(entry);
    }
  }
  return entries;
}

function baseCandidatos(): Entry[] {
  return CANDIDATES.map((c) => ({
    ...c,
    foto_origem: null,
    foto_credito: "Agência Senado",
    situacao: "candidato",
    desde: "2026-10-01",
    desistiu_em: null,
    fonte: `https://agenciabrasil.ebc.com.br/politica/noticia/2026-10/${c.id}`,
  }));
}

function byId(entries: Entry[], id: string): Entry {
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new Error(`makeDataset: no entry with id ${id}`);
  return entry;
}

/** Write a dataset into a fresh temporary directory and return its paths. */
export function makeDataset(overrides: DatasetOverrides = {}): { dir: string; assetsDir: string } {
  const senadores = baseSenadores();
  const candidatos = baseCandidatos();
  let peticao: Entry = { url: null, meta: 100000, contagem_manual: 0 };
  let site: Entry = {
    dominio: "abreovoto.com",
    eleicao: "2027-02-01",
    hashtag: "#AbreOVotoSenador",
    contato: "abreovoto@gmail.com",
    repositorio: "https://github.com/abreovoto/abreovoto",
    ecidadania_url: null,
    redes: { instagram: null, x: null, tiktok: null, youtube: null },
  };

  if (overrides.duplicateVaga) byId(senadores, `${overrides.duplicateVaga.toLowerCase()}-2`).vaga = 1;
  if (overrides.extraSeat) senadores.push(senadorEntry("ac-1-extra", "AC", 1));
  if (overrides.withdraw) {
    const c = byId(candidatos, overrides.withdraw);
    c.situacao = "desistiu";
    c.desistiu_em = FIXTURE_DATE;
  }
  if (overrides.declareFor) {
    const pairs = Array.isArray(overrides.declareFor[0])
      ? (overrides.declareFor as [string, string][])
      : [overrides.declareFor as [string, string]];
    for (const [senatorId, candidateId] of pairs) byId(senadores, senatorId).declaracao = declarou(candidateId);
  }
  if (overrides.shown) {
    const [senatorId, candidateId] = overrides.shown;
    byId(senadores, senatorId).declaracao = { ...declarou(candidateId), status: "mostrou_na_sessao" };
  }
  if (overrides.replace) {
    const [oldId, newId] = overrides.replace;
    const old = byId(senadores, oldId);
    old.situacao = "deixou_mandato";
    old.deixou_em = FIXTURE_DATE;
    old.substituido_por = newId;
    senadores.push(senadorEntry(newId, old.uf as string, old.vaga as 1 | 2 | 3));
  }
  if (overrides.extraKey) byId(senadores, "ac-1").apelidoo = "typo";
  for (const [id, patch] of Object.entries(overrides.senador ?? {})) Object.assign(byId(senadores, id), patch);
  for (const [id, patch] of Object.entries(overrides.candidato ?? {})) Object.assign(byId(candidatos, id), patch);
  senadores.push(...(overrides.extraSenadores ?? []));
  if (overrides.peticao) peticao = { ...peticao, ...overrides.peticao };
  if (overrides.site) site = { ...site, ...overrides.site };

  const root = mkdtempSync(join(tmpdir(), "abreovoto-dataset-"));
  const dir = join(root, "data");
  const assetsDir = join(root, "fotos");
  mkdirSync(dir);
  mkdirSync(join(assetsDir, "senadores"), { recursive: true });
  mkdirSync(join(assetsDir, "candidatos"), { recursive: true });

  writeFileSync(join(dir, "senadores.yaml"), stringify(senadores));
  writeFileSync(join(dir, "candidatos.yaml"), stringify(candidatos));
  writeFileSync(join(dir, "peticao.yaml"), stringify(peticao));
  writeFileSync(join(dir, "site.yaml"), stringify(site));

  for (const s of senadores) {
    if (s.situacao === "em_exercicio" && s.id !== overrides.dropPhoto) {
      writeFileSync(join(assetsDir, "senadores", `${s.id}.jpg`), "");
    }
  }
  for (const c of candidatos) {
    if (c.id !== overrides.dropPhoto) writeFileSync(join(assetsDir, "candidatos", `${c.id}.jpg`), "");
  }
  return { dir, assetsDir };
}

