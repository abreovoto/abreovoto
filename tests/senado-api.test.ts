import { describe, expect, test } from "vitest";
import { buildSeed, incumbencyWarnings, missingSeats } from "../scripts/seed-senadores";
import { type ApiSenador, mergeUnique, parseAtual, parseLegislatura } from "../scripts/senado-api";
import { SenadorSchema } from "../src/data/schema";
import atualJson from "./fixtures/api/lista-atual.json";
import leg58Json from "./fixtures/api/legislatura-58.json";

// The fixtures are real API responses trimmed to a few parliamentarians, plus
// one synthetic person, codigo "999001" ("Pessoa Exemplo"), who does not exist:
// a substitute of a 2023 mandate in lista/atual and the titular of a 2027
// mandate in lista/legislatura/58. The real data has no such case today.

const atual = parseAtual(atualJson);
const leg58 = parseLegislatura(leg58Json, 58);
const merged = mergeUnique([atual, leg58]);

function row(overrides: Partial<ApiSenador>): ApiSenador {
  return {
    codigo: "1",
    nome: "Nome",
    nomeCompleto: "Nome Completo",
    partido: "PX",
    uf: "AC",
    fotoUrl: null,
    email: null,
    legislaturaInicial: 58,
    participacao: "Titular",
    ...overrides,
  };
}

describe("parse", () => {
  test("parseAtual maps the identification block", () => {
    const rows = parseAtual(atualJson);
    expect(rows[0]).toMatchObject({ codigo: "5672", nome: "Alan Rick", uf: "AC", legislaturaInicial: 57, participacao: "Titular" });
    expect(rows[0].fotoUrl).toMatch(/fotos-oficiais\/senador5672\.jpg$/);
    expect(rows[0].email).toBe("sen.alanrick@senado.leg.br");
  });

  test("parseAtual reads the real first legislature and participation", () => {
    expect(atual.find((r) => r.codigo === "5982")).toMatchObject({ legislaturaInicial: 56, participacao: "Titular" });
    expect(atual.find((r) => r.codigo === "6358")).toMatchObject({ legislaturaInicial: 57, participacao: "1º Suplente" });
  });

  test("parseLegislatura reads vaga from the first legislature of the mandate", () => {
    expect(leg58.find((r) => r.codigo === "6133")).toMatchObject({ legislaturaInicial: 58, participacao: "Titular", uf: "PE" });
    expect(leg58.find((r) => r.codigo === "5672")).toMatchObject({ legislaturaInicial: 57, participacao: "Titular" });
  });

  test("parseLegislatura leaves absent photo, e-mail and party as null", () => {
    expect(leg58.find((r) => r.codigo === "6133")).toMatchObject({ fotoUrl: null, email: null });
    expect(leg58.find((r) => r.codigo === "6360")?.partido).toBeNull();
  });

  test("parse rejects a response without the expected envelope", () => {
    expect(() => parseAtual({})).toThrow();
    expect(() => parseLegislatura(atualJson, 58)).toThrow();
  });
});

describe("mergeUnique", () => {
  test("keeps one row per codigo and prefers Titular", () => {
    const codes = merged.map((r) => r.codigo);
    expect(new Set(codes).size).toBe(codes.length);
    expect(merged.find((r) => r.codigo === "6133")?.participacao).toBe("Titular");
  });

  test("a Titular row wins over a substitute row of the same person (synthetic 999001)", () => {
    expect(merged.find((r) => r.codigo === "999001")).toMatchObject({
      participacao: "Titular",
      legislaturaInicial: 58,
      partido: "OUTRO PARTIDO",
      // filled from the lista/atual row, which the winning row lacks
      email: "pessoa.exemplo@example.org",
      fotoUrl: "http://www.example.org/fotos/senador999001.jpg",
    });
  });

  test("fills a party missing from the winning row", () => {
    const a = row({ codigo: "8", participacao: "1º Suplente", partido: "PX" });
    const b = row({ codigo: "8", participacao: "Titular", partido: null });
    expect(mergeUnique([[a], [b]])[0]).toMatchObject({ participacao: "Titular", partido: "PX" });
  });

  test("between rows of equal participation, the later list wins and gaps are filled", () => {
    const a = row({ codigo: "7", partido: "OLD", uf: "AC", email: "a@senado.leg.br", fotoUrl: "http://x.example/a.jpg" });
    const b = row({ codigo: "7", partido: "NEW", uf: "AM", email: null, fotoUrl: null });
    expect(mergeUnique([[a], [b]])).toEqual([{ ...b, email: a.email, fotoUrl: a.fotoUrl }]);
  });
});

describe("buildSeed", () => {
  test("assigns vaga 3 to legislature-57 mandates and 1/2 to 58", () => {
    const entries = buildSeed(merged, "2026-11-01");
    expect(entries.filter((e) => e.vaga === 3).every((e) => e.mandato === "2023-2031")).toBe(true);
    expect(entries.filter((e) => e.vaga !== 3).every((e) => e.mandato === "2027-2035")).toBe(true);
    expect(entries.every((e) => SenadorSchema.safeParse(e).success)).toBe(true);
  });

  test("keeps only titulars of the 2023 and 2027 classes", () => {
    const ids = buildSeed(merged, "2026-11-01").map((e) => e.codigo_senado);
    expect(ids).not.toContain("5982"); // legislature-56 Titular
    expect(ids).not.toContain("6358"); // substitute
    expect(ids).not.toContain("6360"); // substitute
    expect(ids.sort()).toEqual(["4605", "5205", "5672", "6009", "6133", "6686", "999001"].sort());
  });

  test("assigns vagas 1 and 2 per UF in the order encountered", () => {
    const entries = buildSeed(merged, "2026-11-01");
    const vaga = (codigo: string) => entries.find((e) => e.codigo_senado === codigo)?.vaga;
    expect([vaga("5205"), vaga("6686")]).toEqual([1, 2]);
    // 999001 is first encountered in lista/atual, so it precedes 6133 in the merged order.
    expect([vaga("999001"), vaga("6133")]).toEqual([1, 2]);
    expect(vaga("5672")).toBe(3);
  });

  test("fills the entry from the API row", () => {
    const alan = buildSeed(merged, "2026-11-01").find((e) => e.codigo_senado === "5672");
    expect(alan).toEqual({
      id: "alan-rick",
      nome: "Alan Rick",
      nome_completo: "Alan Rick Miranda",
      apelido: null,
      partido: "REPUBLICANOS",
      uf: "AC",
      vaga: 3,
      mandato: "2023-2031",
      situacao: "em_exercicio",
      deixou_em: null,
      substituido_por: null,
      codigo_senado: "5672",
      codigo_camara: null,
      foto_origem: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg",
      foto_credito: "Agência Senado",
      redes: { x: null, instagram: null },
      email_institucional: "sen.alanrick@senado.leg.br",
      declaracao: { status: "nao_declarou", candidato: null, data: null, fonte: null },
      observacoes: [],
      historico: [{ data: "2026-11-01", evento: "criado como nao_declarou", issue: null }],
    });
  });

  test("leaves photo credit null when the API has no photo", () => {
    const marilia = buildSeed(merged, "2026-11-01").find((e) => e.codigo_senado === "6133");
    expect(marilia).toMatchObject({ foto_origem: null, foto_credito: null, email_institucional: null });
  });

  test("fails loudly on an id collision", () => {
    const rows = [row({ codigo: "1", nome: "Maria Silva", uf: "AC" }), row({ codigo: "2", nome: "Maria  Silva", uf: "AM" })];
    expect(() => buildSeed(rows, "2026-11-01")).toThrow(/Maria Silva.*Maria {2}Silva/);
  });

  test("fails loudly when a UF has more titulars than seats", () => {
    const rows = ["1", "2", "3"].map((codigo) => row({ codigo, nome: `Pessoa ${codigo}`, uf: "AC" }));
    expect(() => buildSeed(rows, "2026-11-01")).toThrow(/AC/);
  });

  test("fails loudly when a titular has no party", () => {
    expect(() => buildSeed([row({ partido: null })], "2026-11-01")).toThrow(/partido/);
  });
});

test("missingSeats lists every UF/vaga pair without an entry", () => {
  const missing = missingSeats(buildSeed(merged, "2026-11-01"));
  expect(missing).toHaveLength(81 - 7);
  expect(missing).toContain("AC/1");
  expect(missing).not.toContain("AC/3");
  expect(missing).not.toContain("AL/2");
});

describe("incumbencyWarnings", () => {
  test("flags a vaga-3 titular absent from lista/atual whose substitute is in exercise", () => {
    // Real rows: Flávio Dino (4605) is the MA titular in legislatura/58 only;
    // lista/atual has Ana Paula Lobato (6358), 1º Suplente, in exercise.
    const warnings = incumbencyWarnings(buildSeed(merged, "2026-11-01"), atual);
    expect(warnings).toEqual([
      "MA vaga 3: Flávio Dino é titular, mas quem está em exercício é Ana Paula Lobato (1º Suplente) — confira antes de publicar",
    ]);
  });

  test("leaves the seeded situacao untouched", () => {
    const dino = buildSeed(merged, "2026-11-01").find((e) => e.codigo_senado === "4605");
    expect(dino?.situacao).toBe("em_exercicio");
  });

  test("says nothing about titulars in office or about 2027 mandates", () => {
    const entries = buildSeed(merged, "2026-11-01").filter((e) => e.codigo_senado !== "4605");
    expect(incumbencyWarnings(entries, atual)).toEqual([]);
  });
});
