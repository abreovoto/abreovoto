import { expect, test } from "vitest";
import { asUndeclared } from "./fixtures/undeclared";
import { emExercicio, loadData } from "../src/data/load";
import {
  thirdPersonText,
  whatsappUrl,
  xHandle,
  xIntentUrl,
  xLabel,
  xLength,
  xText,
} from "../src/lib/share-text";

const d = loadData();
const by = (id: string) => d.senadores.find((s) => s.id === id)!;
const declared = (s: ReturnType<typeof by>, candidato: string) => ({
  ...s,
  declaracao: { status: "declarou" as const, candidato, data: "2026-11-07", fonte: { tipo: "nota" as const, url: "https://example.com/n", titulo: null, trecho: "Voto." } },
});

test("the X text mentions the senator, links the page and carries the hashtag", () => {
  const s = by("arthur-lira");
  expect(xText(s, d.candidatos, d.site)).toBe(
    "@arthurlira_, quem te elegeu tem o direito de saber em quem você vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? https://abreovoto.com/senador/arthur-lira/ #AbreOVotoSenador",
  );
});

test("without an X profile, the X text is the third-person one", () => {
  const s = asUndeclared(by("marcio-bittar")); // no X profile; the not-declared text
  const third =
    "Marcio Bittar (PL-AC) representa você no Senado, e você tem o direito de saber em quem vota para presidente do Senado. Vai abrir o voto, ou vai votar em segredo? https://abreovoto.com/senador/marcio-bittar/ #AbreOVotoSenador";
  expect(xHandle(s)).toBeNull();
  expect(thirdPersonText(s, d.candidatos, d.site)).toBe(third);
  expect(xText(s, d.candidatos, d.site)).toBe(third);
});

test("a declared senator's texts name the candidate from the data and are the same shape for the three", () => {
  const s = by("arthur-lira");
  const texts = d.candidatos.map((c) => xText(declared(s, c.id), d.candidatos, d.site));
  expect(texts[0]).toBe(
    "@arthurlira_ abriu o voto para presidente do Senado: Davi Alcolumbre, com fonte pública. Seus eleitores agradecem a transparência. Quem mais? https://abreovoto.com/senador/arthur-lira/ #AbreOVotoSenador",
  );
  expect(new Set(texts.map((t, i) => t.replace(d.candidatos[i]!.nome, "X"))).size).toBe(1);
  expect(thirdPersonText(declared(s, "marinho"), d.candidatos, d.site)).toContain("Arthur Lira (PP-AL) abriu o voto para presidente do Senado: Rogério Marinho,");
  expect(xLabel(declared(s, "marinho"))).toBe("Compartilhar no X");
  expect(xLabel(s)).toBe("Cobrar no X");
});

test("every text fits X and carries no date", () => {
  for (const s of emExercicio(d)) {
    for (const t of [xText(s, d.candidatos, d.site), thirdPersonText(s, d.candidatos, d.site)]) {
      expect(xLength(t), s.id).toBeLessThanOrEqual(280);
      expect(t).not.toMatch(/\d\/\d|1º|fevereiro/);
    }
  }
  const longest = [...d.candidatos].sort((a, b) => b.nome.length - a.nome.length)[0]!;
  const s = by("professora-dorinha-seabra"); // the longest name in office, with an X profile
  for (const f of [xText, thirdPersonText]) expect(xLength(f(declared(s, longest.id), d.candidatos, d.site))).toBeLessThanOrEqual(280);
});

test("the intent URLs encode the text", () => {
  expect(xIntentUrl("a b #c")).toBe("https://x.com/intent/post?text=a%20b%20%23c");
  expect(whatsappUrl("a b")).toBe("https://wa.me/?text=a%20b");
});
