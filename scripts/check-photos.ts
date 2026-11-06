/**
 * Lists the portraits whose source is too small for a context: below 2× of the
 * rendered width (soft on a high-density screen), and, for the share card that
 * is rasterised at 1×, below the rendered width itself. Always exits 0: the
 * decision to re-source a class of photos is a person's.
 */
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";
import { PORTRAIT_SIZES, undersized } from "../src/lib/portrait";

type Photo = { id: string; width: number };

async function photos(dir: string): Promise<Photo[]> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".jpg"))
    .sort();
  const out: Photo[] = [];
  for (const f of files) {
    const { width } = await sharp(join(dir, f)).metadata();
    out.push({ id: basename(f, ".jpg"), width: width ?? 0 });
  }
  return out;
}

const all = [
  ...(await photos("src/assets/fotos/senadores")),
  ...(await photos("src/assets/fotos/candidatos")).map((p) => ({ ...p, id: `candidatos/${p.id}` })),
];

const line = (label: string, ids: string[]) =>
  console.log(`${label}: ${ids.length === 0 ? "none" : `${ids.length} — ${ids.join(", ")}`}`);

line(`page below 2× (${2 * PORTRAIT_SIZES.page} px)`, undersized(all, "page"));
line(`share below 2× (${2 * PORTRAIT_SIZES.share} px)`, undersized(all, "share"));
line(
  `share below 1× (${PORTRAIT_SIZES.share} px, the card is rasterised at 1×)`,
  all.filter((p) => p.width < PORTRAIT_SIZES.share).map((p) => p.id),
);
