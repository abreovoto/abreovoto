import { expect, test } from "vitest";
import { absolute, candidatePath, senateProfileUrl, senatorPath, statePath } from "../src/lib/routes";
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
