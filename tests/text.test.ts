import { expect, test } from "vitest";
import { loadData } from "../src/data/load";
import {
  assumeEmNote,
  departureNote,
  formatDate,
  isCandidate,
  longestName,
  partyState,
  sourceHost,
  sourceTypeLabel,
  statusLabel,
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
  expect(statusLabel(by("marcio-bittar"), d.candidatos)).toBe("não declarou");
  const declared = {
    ...by("marcio-bittar"),
    declaracao: {
      status: "declarou" as const,
      candidato: "marinho",
      data: "2026-11-05",
      fonte: { tipo: "materia" as const, url: "https://example.org/x", titulo: null, trecho: "x" },
    },
  };
  expect(statusLabel(declared, d.candidatos)).toBe("declarou voto em Rogério Marinho");
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

test("partyState, isCandidate, sourceHost, longestName", () => {
  expect(partyState(by("rogerio-marinho"))).toBe("PL-RN");
  expect(isCandidate(by("rogerio-marinho"), d.candidatos)).toBe(true);
  expect(isCandidate(by("marcio-bittar"), d.candidatos)).toBe(false);
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
