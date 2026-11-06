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
  statusLabel,
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
