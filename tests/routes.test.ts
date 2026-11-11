import { expect, test } from "vitest";
import { absolute, bareUrl, candidatePath, onOrigin, textOnOrigin, senateProfileUrl, senatorPath, statePath } from "../src/lib/routes";
import { UF_NAMES, ufName } from "../src/lib/uf";

test("paths are lowercase, Portuguese and end with a slash", () => {
  expect(senatorPath("marcio-bittar")).toBe("/senador/marcio-bittar/");
  expect(statePath("RN")).toBe("/estado/rn/");
  expect(candidatePath("marinho")).toBe("/candidato/marinho/");
  expect(absolute("/estado/rn/")).toBe("https://abreovoto.com/estado/rn/");
  expect(senateProfileUrl("285")).toBe("https://www25.senado.leg.br/web/senadores/senador/-/perfil/285");
});

test("every UF has an official name", () => {
  expect(Object.keys(UF_NAMES)).toHaveLength(27);
  expect(ufName("DF")).toBe("Distrito Federal");
  expect(ufName("SP")).toBe("São Paulo");
});

test("a copied address keeps its path and version on the origin the visitor is on", () => {
  expect(onOrigin("https://abreovoto.com/?v=5dbfa76a", "https://abreovoto.com")).toBe("https://abreovoto.com/?v=5dbfa76a");
  expect(onOrigin("https://abreovoto.com/?v=5dbfa76a", "https://abc123-abreovoto.example.workers.dev")).toBe("https://abc123-abreovoto.example.workers.dev/?v=5dbfa76a");
  expect(onOrigin("https://abreovoto.com/senador/arthur-lira/?v=1a2b3c4d", "http://localhost:4321")).toBe("http://localhost:4321/senador/arthur-lira/?v=1a2b3c4d");
});

test("a post's address is written without the scheme, and follows the visitor to a preview", () => {
  expect(bareUrl("https://abreovoto.com/?v=5dbfa76a")).toBe("abreovoto.com/?v=5dbfa76a");
  const text = "Veja: abreovoto.com/?v=5dbfa76a Compartilhe!";
  expect(textOnOrigin(text, "https://abreovoto.com/?v=5dbfa76a", "https://abreovoto.com")).toBe(text);
  expect(textOnOrigin(text, "https://abreovoto.com/?v=5dbfa76a", "https://x-abreovoto.example.workers.dev")).toBe("Veja: x-abreovoto.example.workers.dev/?v=5dbfa76a Compartilhe!");
});
