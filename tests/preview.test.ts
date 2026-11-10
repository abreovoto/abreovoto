import { expect, test } from "vitest";
import { PRODUCTION_URL, previewOrigin, siteOrigin } from "../src/lib/preview";
import { IS_PREVIEW, SITE_URL } from "../src/lib/routes";

test("a branch's preview address follows Workers Builds' naming", () => {
  expect(previewOrigin("feat/cartao-da-home-com-placar")).toBe("https://feat-cartao-da-home-com-placar-abreovoto.abreovoto.workers.dev");
  expect(previewOrigin("chore/declaracao-efraim-filho")).toBe("https://chore-declaracao-efraim-filho-abreovoto.abreovoto.workers.dev");
  expect(previewOrigin("Fix/Algo_Novo")).toBe("https://fix-algo-novo-abreovoto.abreovoto.workers.dev");
});

test("production, a local build and an address too long for DNS keep abreovoto.com", () => {
  expect(previewOrigin("main")).toBeNull();
  expect(previewOrigin(undefined)).toBeNull();
  expect(previewOrigin("")).toBeNull();
  expect(previewOrigin(`feat/${"a".repeat(60)}`)).toBeNull();
  expect(siteOrigin("main")).toBe(PRODUCTION_URL);
  expect(siteOrigin(undefined)).toBe("https://abreovoto.com");
});

test("outside a build the site is abreovoto.com", () => {
  expect(SITE_URL).toBe("https://abreovoto.com");
  expect(IS_PREVIEW).toBe(false);
});
