/**
 * The fonts the share card is rasterised with. Satori renders a variable font at
 * its default instance only, so the three Archivo instances the card uses are
 * committed as static files. Paths resolve against the working directory, as
 * the data loader's do: inside the build, `import.meta.url` points into the bundle.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type CardFont = { name: "Display" | "Text"; data: Buffer; weight: 400 | 600 | 800; style: "normal" };

const read = (file: string): Buffer => readFileSync(resolve("src", "assets", "fonts", file));

export function cardFonts(): CardFont[] {
  return [
    { name: "Display", data: read("archivo-expanded-800.ttf"), weight: 800, style: "normal" },
    { name: "Text", data: read("archivo-400.ttf"), weight: 400, style: "normal" },
    { name: "Text", data: read("archivo-600.ttf"), weight: 600, style: "normal" },
  ];
}
