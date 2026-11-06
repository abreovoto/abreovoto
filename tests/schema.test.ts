import { expect, test } from "vitest";
import { DeclaracaoSchema, SenadorSchema, SiteSchema, httpsUrl } from "../src/data/schema";

const fonte = { tipo: "materia", url: "https://x.com/a", titulo: null, trecho: "voto em X" };

test("nao_declarou carries no candidate and no source", () => {
  expect(DeclaracaoSchema.safeParse({ status: "nao_declarou", candidato: null, data: null, fonte: null }).success).toBe(true);
  expect(DeclaracaoSchema.safeParse({ status: "nao_declarou", candidato: "marinho", data: null, fonte: null }).success).toBe(false);
});

test("declarou requires candidate, date, source with quote", () => {
  expect(DeclaracaoSchema.safeParse({ status: "declarou", candidato: "marinho", data: "2026-11-04", fonte }).success).toBe(true);
  expect(DeclaracaoSchema.safeParse({ status: "declarou", candidato: "marinho", data: "2026-11-04", fonte: { ...fonte, trecho: "" } }).success).toBe(false);
  expect(DeclaracaoSchema.safeParse({ status: "declarou", candidato: null, data: "2026-11-04", fonte }).success).toBe(false);
});

test("declaration date cannot be in the future", () => {
  expect(DeclaracaoSchema.safeParse({ status: "declarou", candidato: "marinho", data: "2099-01-01", fonte }).success).toBe(false);
});

test("source url must be https and not WhatsApp", () => {
  expect(httpsUrl.safeParse("http://x.com/a").success).toBe(false);
  expect(httpsUrl.safeParse("x.com/a").success).toBe(false);
  expect(httpsUrl.safeParse("https://wa.me/5511999").success).toBe(false);
  expect(httpsUrl.safeParse("https://chat.whatsapp.com/abc").success).toBe(false);
  expect(httpsUrl.safeParse("https://wa.me./5511999").success).toBe(false);
  expect(httpsUrl.safeParse("https://chat.whatsapp.com./abc").success).toBe(false);
  expect(httpsUrl.safeParse("https://www12.senado.leg.br/noticias/x").success).toBe(true);
});

test("senator vaga and mandato are constrained", () => {
  const base = { id: "a", nome: "A", nome_completo: null, apelido: null, partido: "PL", uf: "RN", vaga: 1, mandato: "2027-2035", situacao: "em_exercicio", deixou_em: null, substituido_por: null, codigo_senado: null, codigo_camara: null, foto_origem: null, foto_credito: null, redes: { x: null, instagram: null }, email_institucional: null, declaracao: { status: "nao_declarou", candidato: null, data: null, fonte: null }, observacoes: [], historico: [] };
  expect(SenadorSchema.safeParse(base).success).toBe(true);
  expect(SenadorSchema.safeParse({ ...base, vaga: 4 }).success).toBe(false);
  expect(SenadorSchema.safeParse({ ...base, uf: "XX" }).success).toBe(false);
  expect(SenadorSchema.safeParse({ ...base, mandato: "2025-2033" }).success).toBe(false);
});

test("site lists the initiative's own profiles as https links or null", () => {
  const site = { dominio: "abreovoto.com", eleicao: "2027-02-01", hashtag: "#AbreOVotoSenador", contato: "abreovoto@gmail.com", repositorio: "https://github.com/abreovoto/abreovoto", ecidadania_url: null };
  const redes = { instagram: "https://www.instagram.com/abreovoto", x: null, tiktok: null, youtube: null };
  expect(SiteSchema.safeParse({ ...site, redes }).success).toBe(true);
  expect(SiteSchema.safeParse(site).success).toBe(false);
  expect(SiteSchema.safeParse({ ...site, redes: { ...redes, x: "@abreovoto" } }).success).toBe(false);
});
