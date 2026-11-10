import { expect, test } from "vitest";
import { asUndeclared } from "./fixtures/undeclared";
import { type Dataset, loadData } from "../src/data/load";
import { posicao } from "../src/data/posicao";
import { declarou, makeDataset, partidoEntry } from "./fixtures/make-dataset";
import {
  assumeEmNote,
  departureNote,
  formatDate,
  candidateBadge,
  longestName,
  partyState,
  quoted,
  sourceHost,
  positionSourceLabel,
  sourceTypeLabel,
  hemicycleLabel,
  levelNote,
  partyNoLongerCounts,
  statusLabel,
  statusPrefix,
  statusSentence,
  tieShortWords,
  profileHandle,
} from "../src/lib/text";

const d = loadData();
const by = (id: string) => d.senadores.find((s) => s.id === id)!;

test("formatDate is day/month/year without zero padding", () => {
  expect(formatDate("2027-01-06")).toBe("6/1/2027");
  expect(formatDate("2024-12-25")).toBe("25/12/2024");
});

test("statusLabel uses the site's exact labels", () => {
  expect(statusLabel(asUndeclared(by("marcio-bittar")), d)).toBe("não declarou");
  const declared = {
    ...by("marcio-bittar"),
    declaracao: {
      status: "declarou" as const,
      candidato: "marinho",
      data: "2026-11-05",
      fonte: { tipo: "materia" as const, url: "https://example.org/x", titulo: null, trecho: "x" },
    },
  };
  expect(statusLabel(declared, d)).toBe("declarou voto em Rogério Marinho");
});

const nao = { status: "nao_declarou", candidato: null, data: null, fonte: null };
/** One senator per level, in the fixture: ac-1..ac-3 and ba-1 in PSD, PL, PSB, PDT. */
const levels: Dataset = loadData(
  makeDataset({
    senador: {
      "ac-1": { declaracao: { ...declarou("marinho"), status: "apoio_mapeado", fonte: { ...declarou("marinho").fonte as object, tipo: "post" } } },
      "ac-2": { partido: "PSD" },
      "ac-3": { partido: "PSB" },
      "ba-1": { partido: "PDT" },
      "rn-3": { declaracao: nao },
    },
    shown: ["ba-2", "alcolumbre"],
    partidos: [partidoEntry("PSD", "marinho"), partidoEntry("PSB", "alcolumbre", undefined, "federacao"), partidoEntry("PDT", "marinho", undefined, "bancada")],
  }),
);
const at = (id: string) => levels.senadores.find((s) => s.id === id)!;
const pos = (id: string) => posicao(at(id), levels);

test("statusLabel and statusPrefix follow the level in effect", () => {
  const cases: [string, string, string][] = [
    ["ba-3", "não declarou", "não declarou"],
    ["ap-3", "declarou voto em", "declarou voto em Davi Alcolumbre"],
    ["ba-2", "mostrou o voto na sessão:", "mostrou o voto na sessão: Davi Alcolumbre"],
    ["ac-1", "apoio mapeado a", "apoio mapeado a Rogério Marinho"],
    ["rn-3", "apoio mapeado a", "apoio mapeado a Rogério Marinho"],
    ["ac-2", "apoio pelo partido a", "apoio pelo partido a Rogério Marinho"],
    ["ba-1", "apoio pelo partido a", "apoio pelo partido a Rogério Marinho"],
    ["ac-3", "apoio pela federação a", "apoio pela federação a Davi Alcolumbre"],
  ];
  for (const [id, prefix, label] of cases) {
    expect(statusPrefix(pos(id)), id).toBe(prefix);
    expect(statusLabel(at(id), levels), id).toBe(label);
  }
});

test("positionSourceLabel never says a mapped source is the senator's own", () => {
  expect(positionSourceLabel(pos("ap-3"))).toBe("matéria com citação direta");
  expect(positionSourceLabel(pos("ba-2"))).toBe("matéria com citação direta");
  expect(positionSourceLabel(pos("ac-1"))).toBe("publicação");
  expect(positionSourceLabel(pos("rn-3"))).toBe("anúncio da candidatura");
  expect(positionSourceLabel(pos("ac-2"))).toBe("anúncio do partido");
  expect(positionSourceLabel(pos("ba-1"))).toBe("anúncio da bancada");
  expect(positionSourceLabel(pos("ac-3"))).toBe("anúncio da federação");
  expect(positionSourceLabel(pos("ba-3"))).toBe("");
  const mapped = (tipo: string) => positionSourceLabel({ ...pos("ac-1"), fonte: { ...pos("ac-1").fonte!, tipo } as never });
  expect(["video", "post", "materia", "nota", "email_institucional"].map(mapped)).toEqual([
    "vídeo",
    "publicação",
    "matéria jornalística",
    "nota oficial",
    "e-mail institucional",
  ]);
});

test("the three substitutes carry the same forecast note", () => {
  const notes = ["alex-diniz", "luis-felipe-cunha", "cheila-moreira"].map((id) => assumeEmNote(by(id)));
  expect(new Set(notes)).toEqual(new Set(["assume a vaga em 6/1/2027"]));
  expect(assumeEmNote(by("marcio-bittar"))).toBeNull();
});

test("a departed senator gets a departure note and no status", () => {
  expect(departureNote(by("flavio-dino"))).toBe("deixou o mandato em 20/2/2024");
  expect(departureNote(by("marcio-bittar"))).toBeNull();
});

test("a departure or arrival still ahead is written in the present tense", () => {
  expect(departureNote(by("cleitinho"), "2026-11-07")).toBe("deixa o mandato em 6/1/2027");
  expect(departureNote(by("cleitinho"), "2027-01-06")).toBe("deixou o mandato em 6/1/2027");
  expect(assumeEmNote(by("alex-diniz"), "2026-11-07")).toBe("assume a vaga em 6/1/2027");
  expect(assumeEmNote(by("alex-diniz"), "2027-01-06")).toBe("assumiu a vaga em 6/1/2027");
});

test("partyState, candidateBadge, sourceHost, longestName", () => {
  expect(partyState(by("rogerio-marinho"))).toBe("PL-RN");
  expect(candidateBadge(by("rogerio-marinho"), d.candidatos)).toBe("candidato");
  expect(candidateBadge(by("tereza-cristina"), d.candidatos)).toBe("candidata");
  expect(candidateBadge(by("marcio-bittar"), d.candidatos)).toBeNull();
  expect(sourceHost("https://www.gazetadopovo.com.br/republica/x")).toBe("gazetadopovo.com.br");
  expect(longestName(d).situacao).toBe("em_exercicio");
});

test("source types in words", () => {
  expect(sourceTypeLabel("video")).toBe("vídeo");
  expect(sourceTypeLabel("post")).toBe("publicação no perfil oficial");
  expect(sourceTypeLabel("materia")).toBe("matéria com citação direta");
  expect(sourceTypeLabel("nota")).toBe("nota oficial");
  expect(sourceTypeLabel("email_institucional")).toBe("e-mail institucional");
});

test("short words are tied to the next one in text, never inside a tag", () => {
  expect(tieShortWords("Para que em 2029 isso não precise de campanha")).toBe("Para que em\u00a02029 isso não precise de\u00a0campanha");
  expect(tieShortWords("vence a eleição e o voto")).toBe("vence a\u00a0eleição e\u00a0o\u00a0voto");
  expect(tieShortWords('<a href="/a b/" title="de x">de fato</a> desde')).toBe('<a href="/a b/" title="de x">de\u00a0fato</a> desde');
  expect(tieShortWords("O site")).toBe("O\u00a0site");
  expect(tieShortWords('ficam em um <a href="/r/">repositório</a>')).toBe('ficam em\u00a0um\u00a0<a href="/r/">repositório</a>');
  expect(tieShortWords("fica de\n  fora")).toBe("fica de\u00a0fora");
});

test("a profile link shows as its handle", () => {
  expect(profileHandle("https://www.instagram.com/marciobittar_")).toBe("@marciobittar_");
  expect(profileHandle("https://x.com/davialcolumbre/")).toBe("@davialcolumbre");
});

test("a declaration's excerpt is shown inside quotation marks, as the senator's words", () => {
  expect(quoted("Estamos com X para presidente do Senado")).toBe("“Estamos com X para presidente do Senado”");
  expect(quoted("[…] para o bem do país")).toBe("“[…] para o bem do país”");
});

test("statusSentence reads as a sentence after the name, for every level", () => {
  const cases: [string, string][] = [
    ["ba-3", "não declarou"],
    ["ap-3", "declarou voto em Davi Alcolumbre"],
    ["ba-2", "mostrou o voto na sessão: Davi Alcolumbre"],
    ["ac-1", "aparece com apoio mapeado a Rogério Marinho"],
    ["rn-3", "é candidato a presidente do Senado"],
    ["ac-2", "aparece com apoio pelo partido a Rogério Marinho"],
    ["ac-3", "aparece com apoio pela federação a Davi Alcolumbre"],
  ];
  for (const [id, sentence] of cases) expect(statusSentence(at(id), levels), id).toBe(sentence);
  const tereza = { ...at("ms-3"), declaracao: nao } as ReturnType<typeof at>;
  expect(statusSentence(tereza, levels)).toBe("é candidata a presidente do Senado");
});

test("the party no longer counts only where the opt-out is what leaves the senator without a position", () => {
  const recusa = { partido: "PSD", data: "2026-10-12", trecho: "ainda não decidi", fonte_url: "https://example.org/r" };
  const withRecusa = (id: string, patch: object = {}) => posicao({ ...at(id), ...patch, recusa_partido: recusa } as never, levels);
  expect(partyNoLongerCounts(withRecusa("ac-2"))).toBe(true); // PSD backs marinho; the opt-out blocks it
  expect(partyNoLongerCounts(withRecusa("ac-2", { declaracao: declarou("marinho") }))).toBe(false); // a declaration is in effect
  expect(partyNoLongerCounts(withRecusa("ba-3"))).toBe(false); // no party announcement
  expect(partyNoLongerCounts(pos("ac-2"))).toBe(false); // no opt-out
  expect(partyNoLongerCounts(posicao({ ...at("ac-2"), recusa_partido: { ...recusa, partido: "PP" } } as never, levels))).toBe(false); // an opt-out from another party
});

test("the hemicycle's label agrees in number with each count", () => {
  expect(hemicycleLabel({ declararam: 1, mapeados: 1, partido: 1, total: 81 })).toBe(
    "81 cadeiras do Senado: 78 sem posição conhecida, 1 declarou, 1 apoio mapeado, 1 pelo partido",
  );
  expect(hemicycleLabel({ declararam: 13, mapeados: 3, partido: 0, total: 81 })).toBe(
    "81 cadeiras do Senado: 65 sem posição conhecida, 13 declararam, 3 apoio mapeado, 0 pelo partido",
  );
});

test("levelNote says, below the senator's own word, whose word it is — naming the candidate it supports", () => {
  expect(levelNote(at("ap-3"), levels)).toBeNull();
  expect(levelNote(at("ba-3"), levels)).toBeNull();
  expect(levelNote(at("ac-1"), levels)).toBe(
    "Uma fonte pública cita Senador AC-1 pelo nome como apoio a Rogério Marinho. Não é uma declaração de voto: Senador AC-1 ainda não disse em público em quem vota.",
  );
  expect(levelNote(at("rn-3"), levels)).toBe(
    "Rogério Marinho lançou a própria candidatura em 1/10/2026. A candidatura conta como apoio mapeado a si mesmo, não como declaração de voto.",
  );
  expect(levelNote(at("ac-2"), levels)).toBe("O partido PSD anunciou o apoio. Senador AC-2 ainda não declarou o voto em público.");
  expect(levelNote(at("ba-1"), levels)).toBe("A bancada do partido PDT no Senado anunciou o apoio. Senador BA-1 ainda não declarou o voto em público.");
  expect(levelNote(at("ac-3"), levels)).toBe("A federação que inclui o partido PSB anunciou o apoio. Senador AC-3 ainda não declarou o voto em público.");
  const tereza = { ...at("ms-3"), declaracao: nao } as ReturnType<typeof at>;
  expect(levelNote(tereza, levels)).toContain("apoio mapeado a si mesma");
});
