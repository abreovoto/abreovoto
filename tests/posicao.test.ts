import { expect, test } from "vitest";
import { type Dataset, loadData } from "../src/data/load";
import { posicao, proprioVoto } from "../src/data/posicao";
import { type DatasetOverrides, declarou, makeDataset, partidoEntry } from "./fixtures/make-dataset";

const nao = { status: "nao_declarou", candidato: null, data: null, fonte: null };
const mapped = (candidato: string) => ({ ...declarou(candidato), status: "apoio_mapeado" });
const recusa = { partido: "PSD", data: "2026-10-12", trecho: "ainda não decidi", fonte_url: "https://www12.senado.leg.br/noticias/recusa" };

function load(overrides: DatasetOverrides): Dataset {
  return loadData(makeDataset(overrides));
}

function of(d: Dataset, id: string) {
  const s = d.senadores.find((x) => x.id === id);
  if (!s) throw new Error(id);
  return posicao(s, d);
}

/** ac-1 and ac-2 belong to PSD. */
const psd = { "ac-1": { partido: "PSD" }, "ac-2": { partido: "PSD" } };

test("declarou beats a party entry for another candidate", () => {
  const d = load({ senador: psd, declareFor: ["ac-1", "alcolumbre"], partidos: [partidoEntry("PSD", "marinho")] });
  const p = of(d, "ac-1");
  expect(p).toMatchObject({ nivel: "declarou", candidato: "alcolumbre", origem: "senador", data: "2026-10-15" });
  expect(p.partido?.candidato).toBe("marinho");
});

test("stored apoio_mapeado beats the party entry", () => {
  const d = load({ senador: { ...psd, "ac-1": { partido: "PSD", declaracao: mapped("alcolumbre") } }, partidos: [partidoEntry("PSD", "marinho")] });
  expect(of(d, "ac-1")).toMatchObject({ nivel: "apoio_mapeado", candidato: "alcolumbre", origem: "senador" });
});

test("a running candidate is mapped to themselves, sourced by the candidacy", () => {
  const d = load({ senador: { "rn-3": { declaracao: nao } } });
  const p = of(d, "rn-3");
  expect(p).toMatchObject({ nivel: "apoio_mapeado", candidato: "marinho", origem: "candidatura", data: "2026-10-01" });
  expect(p.fonte).toEqual({ tipo: "candidatura", url: "https://agenciabrasil.ebc.com.br/politica/noticia/2026-10/marinho", titulo: null, trecho: null });
});

test("a running candidate is never attributed to a rival by their party", () => {
  const d = load({ senador: { "ms-3": { declaracao: nao } }, partidos: [partidoEntry("PP", "alcolumbre")] });
  const p = of(d, "ms-3");
  expect(p).toMatchObject({ nivel: "apoio_mapeado", candidato: "tereza-cristina", origem: "candidatura" });
  expect(p.partido?.candidato).toBe("alcolumbre");
});

test("a candidate's own declaration for a rival beats self-support", () => {
  const d = load({ declareFor: ["rn-3", "alcolumbre"] });
  expect(of(d, "rn-3")).toMatchObject({ nivel: "declarou", candidato: "alcolumbre" });
});

test("a withdrawn candidate loses self-support", () => {
  const d = load({ withdraw: "marinho", senador: { "rn-3": { declaracao: nao } } });
  expect(of(d, "rn-3")).toMatchObject({ nivel: "nao_declarou", candidato: null, fonte: null, origem: null });
});

test("a withdrawn candidate falls to their party's support", () => {
  const d = load({ withdraw: "marinho", senador: { "rn-3": { declaracao: nao } }, partidos: [partidoEntry("PL", "alcolumbre")] });
  expect(of(d, "rn-3")).toMatchObject({ nivel: "partido", candidato: "alcolumbre", origem: "partido" });
});

test("party support applies to every senator of the party without a higher level", () => {
  const entry = partidoEntry("PSD", "marinho", "2026-10-10");
  const d = load({ senador: psd, partidos: [entry] });
  for (const id of ["ac-1", "ac-2"]) {
    const p = of(d, id);
    expect(p).toMatchObject({ nivel: "partido", candidato: "marinho", origem: "partido", data: "2026-10-10" });
    expect(p.fonte).toEqual(entry.fonte);
  }
  expect(of(d, "ac-3").nivel).toBe("nao_declarou");
});

test("a bancada entry reads as bancada", () => {
  const d = load({ senador: psd, partidos: [partidoEntry("PSD", "marinho", undefined, "bancada")] });
  expect(of(d, "ac-1")).toMatchObject({ nivel: "partido", origem: "bancada" });
});

test("a federation entry reads as federacao", () => {
  const d = load({ senador: psd, partidos: [partidoEntry("PSD", "marinho", undefined, "federacao")] });
  expect(of(d, "ac-1")).toMatchObject({ nivel: "partido", origem: "federacao" });
});

test("the latest party entry wins; a null candidate releases the caucus", () => {
  const d = load({ senador: psd, partidos: [partidoEntry("PSD", null, "2026-10-12"), partidoEntry("PSD", "marinho", "2026-10-01")] });
  const p = of(d, "ac-1");
  expect(p).toMatchObject({ nivel: "nao_declarou", candidato: null });
  expect(p.partido).toMatchObject({ candidato: null, data: "2026-10-12" });
});

test("the latest party entry wins over an earlier endorsement", () => {
  const d = load({ senador: psd, partidos: [partidoEntry("PSD", "marinho", "2026-10-01"), partidoEntry("PSD", "alcolumbre", "2026-10-12")] });
  expect(of(d, "ac-1")).toMatchObject({ nivel: "partido", candidato: "alcolumbre" });
});

test("recusa_partido blocks party support, even against a newer announcement", () => {
  const d = load({
    senador: { ...psd, "ac-1": { partido: "PSD", recusa_partido: recusa } },
    partidos: [partidoEntry("PSD", "marinho", "2026-10-01"), partidoEntry("PSD", "alcolumbre", "2026-10-14")],
  });
  const p = of(d, "ac-1");
  expect(p).toMatchObject({ nivel: "nao_declarou", candidato: null });
  expect(p.recusa).toEqual(recusa);
  expect(p.partido?.candidato).toBe("alcolumbre");
  expect(of(d, "ac-2")).toMatchObject({ nivel: "partido", candidato: "alcolumbre" });
});

test("recusa_partido does not block the senator's own higher level", () => {
  const d = load({ senador: { "ac-1": { recusa_partido: recusa, declaracao: declarou("marinho") } } });
  expect(of(d, "ac-1")).toMatchObject({ nivel: "declarou", recusa });
});

test("proprioVoto is true only for declarou and mostrou_na_sessao", () => {
  const d = load({
    senador: { ...psd, "ac-3": { declaracao: mapped("marinho") }, "rn-3": { declaracao: nao } },
    shown: ["ba-1", "marinho"],
    partidos: [partidoEntry("PSD", "marinho")],
  });
  expect(proprioVoto(of(d, "ap-3"))).toBe(true); // declarou
  expect(proprioVoto(of(d, "ba-1"))).toBe(true); // mostrou_na_sessao
  expect(proprioVoto(of(d, "ac-3"))).toBe(false); // stored apoio_mapeado
  expect(proprioVoto(of(d, "rn-3"))).toBe(false); // candidacy
  expect(proprioVoto(of(d, "ac-1"))).toBe(false); // party
  expect(proprioVoto(of(d, "ba-2"))).toBe(false); // nao_declarou
});

test("a senator no longer in office gets no party support", () => {
  const d = load({ senador: psd, replace: ["ac-1", "ac-1-suplente"], partidos: [partidoEntry("PSD", "marinho")] });
  expect(of(d, "ac-1")).toMatchObject({ nivel: "nao_declarou" });
  expect(of(d, "ac-2")).toMatchObject({ nivel: "partido" });
});

test("an opt-out from another party does not block the senator's current party", () => {
  const d = load({ senador: { ...psd, "ac-1": { partido: "PSD", recusa_partido: { ...recusa, partido: "PP" } } }, partidos: [partidoEntry("PSD", "marinho")] });
  const p = of(d, "ac-1");
  expect(p).toMatchObject({ nivel: "partido", candidato: "marinho" });
  expect(p.recusa?.partido).toBe("PP");
});
