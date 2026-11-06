// Downloads every official portrait named by `foto_origem` in data/ and
// writes it, normalised, to src/assets/fotos/<kind>/<id>.jpg. Files already
// present are left alone: delete one to fetch it again.
//
// `foto_origem` is either a direct image URL or `<zip URL>#<member>`, for
// sources that publish photos only inside an archive (the TSE ships one zip
// per UF). Each zip is downloaded once per run.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { unzipSync } from "fflate";
import sharp from "sharp";
import { parse } from "yaml";
import { z } from "zod";
import { CandidatoSchema, SenadorSchema } from "../src/data/schema";

const ASSETS = "src/assets/fotos";
const WIDTH = 480;
const QUALITY = 82;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export type Kind = "senadores" | "candidatos";

/** Resize to WIDTH (never enlarging), re-encode as JPEG, drop all metadata. */
export function normalizePhoto(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();
}

/** Split `<zip URL>#<member>` into its parts; a plain URL has no member. */
export function splitOrigin(origin: string): { url: string; member: string | null } {
  const hash = origin.indexOf("#");
  if (hash === -1) return { url: origin, member: null };
  return { url: origin.slice(0, hash), member: origin.slice(hash + 1) };
}

/** Where the photo of entry `id` lives, relative to the repository root. */
export function targetPath(kind: Kind, id: string): string {
  return `${ASSETS}/${kind}/${id}.jpg`;
}

async function download(url: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function readEntries<T extends z.ZodType>(file: string, schema: T): z.infer<T>[] {
  return z.array(schema).parse(parse(readFileSync(join("data", file), "utf8")));
}

async function main(): Promise<number> {
  const entries: { kind: Kind; id: string; origin: string | null }[] = [
    ...readEntries("senadores.yaml", SenadorSchema).map((s) => ({ kind: "senadores" as const, id: s.id, origin: s.foto_origem })),
    ...readEntries("candidatos.yaml", CandidatoSchema).map((c) => ({ kind: "candidatos" as const, id: c.id, origin: c.foto_origem })),
  ];

  const zips = new Map<string, Promise<Record<string, Uint8Array>>>();
  const failed: string[] = [];
  let written = 0;

  for (const e of entries) {
    if (e.origin === null) continue;
    const path = targetPath(e.kind, e.id);
    if (existsSync(path)) continue;
    const { url, member } = splitOrigin(e.origin);
    try {
      let raw: Buffer;
      if (member === null) {
        raw = await download(url);
      } else {
        let zip = zips.get(url);
        if (!zip) {
          zip = download(url).then((b) => unzipSync(new Uint8Array(b)));
          zips.set(url, zip);
        }
        const file = (await zip)[member];
        if (!file) throw new Error(`${member} não está no zip`);
        raw = Buffer.from(file);
      }
      const out = await normalizePhoto(raw);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, out);
      written++;
      console.log(`fotos: ${path} (${out.length} bytes)`);
    } catch (err) {
      failed.push(e.id);
      console.error(`fotos: FALHOU ${e.kind}/${e.id} ${e.origin}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const missing = entries.filter((e) => e.origin === null).map((e) => `${e.kind}/${e.id}`);
  console.log(`fotos: ${written} gravada(s), ${failed.length} falha(s)`);
  console.log(`fotos: sem foto_origem: ${missing.length === 0 ? "nenhuma" : missing.join(", ")}`);
  return failed.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
