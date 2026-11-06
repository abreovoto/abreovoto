import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// The founding language rule: the site's own voice never carries these words.
const FORBIDDEN = ["esconde", "covarde", "traidor", "se escondeu"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
}

test("the site's own text never carries a forbidden word", () => {
  for (const f of files("src").filter((f) => /\.(astro|ts|css|md)$/.test(f))) {
    const text = readFileSync(f, "utf8").toLowerCase();
    for (const w of FORBIDDEN) expect(text, `${f} contains "${w}"`).not.toContain(w);
  }
});
