import sharp from "sharp";
import { expect, test } from "vitest";
import { normalizePhoto, splitOrigin, targetPath } from "../scripts/fetch-fotos";

test("normalizePhoto resizes to 480 wide and strips metadata", async () => {
  const big = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: "#888" } })
    .withMetadata({ exif: { IFD0: { Copyright: "x" } } })
    .jpeg()
    .toBuffer();
  expect((await sharp(big).metadata()).exif).toBeDefined();
  const out = await normalizePhoto(big);
  const meta = await sharp(out).metadata();
  expect(meta.width).toBe(480);
  expect(meta.format).toBe("jpeg");
  expect(meta.exif).toBeUndefined();
});

test("normalizePhoto does not enlarge a small photo", async () => {
  const small = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#888" } }).jpeg().toBuffer();
  expect((await sharp(await normalizePhoto(small)).metadata()).width).toBe(300);
});

test("splitOrigin separates a zip member from its zip URL", () => {
  expect(splitOrigin("https://cdn.tse.jus.br/f/foto_cand2026_AC_div.zip#FAC1_div.jpg")).toEqual({
    url: "https://cdn.tse.jus.br/f/foto_cand2026_AC_div.zip",
    member: "FAC1_div.jpg",
  });
  expect(splitOrigin("https://x.leg.br/a.jpg")).toEqual({ url: "https://x.leg.br/a.jpg", member: null });
});

test("targetPath follows the id convention", () => {
  expect(targetPath("senadores", "alan-rick")).toBe("src/assets/fotos/senadores/alan-rick.jpg");
});
