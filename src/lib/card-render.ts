/**
 * Rasterises a share card at build time: satori lays the tree out as SVG and
 * resvg turns it into a 1200×630 PNG.
 */
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import sharp from "sharp";
import { cardFonts } from "./card-fonts";
import { cardTree } from "./card-tree";
import { PORTRAIT_SIZES, type PortraitSize, portraitHeight } from "./portrait";
import type { ShareCardModel } from "./share-card";

/** The source photo of a senator or candidate, as an absolute path (from the working directory, as the data loader resolves it). */
export function photoFile(kind: "senadores" | "candidatos", id: string): string {
  return resolve("src", "assets", "fotos", kind, `${id}.jpg`);
}

/** The portrait cropped to its size on a card, top-anchored, as a PNG data URI. */
export async function portraitDataUri(file: string, size: Extract<PortraitSize, "share" | "homeShare"> = "share"): Promise<string> {
  const png = await sharp(file)
    .resize(PORTRAIT_SIZES[size], portraitHeight(size), { fit: "cover", position: "top" })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

let fonts: ReturnType<typeof cardFonts> | undefined;

export async function renderCard(model: ShareCardModel, portrait: string | null, faces: Record<string, string> = {}): Promise<Buffer> {
  fonts ??= cardFonts();
  const svg = await satori(cardTree(model, portrait, faces) as never, { width: 1200, height: 630, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
}

/** The home card's candidate faces, by id, for `renderCard`. */
export async function homeFaces(model: ShareCardModel): Promise<Record<string, string>> {
  const ids = model.scoreboard?.candidates.map((c) => c.id) ?? [];
  return Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await portraitDataUri(photoFile("candidatos", id), "homeShare")] as const)));
}
