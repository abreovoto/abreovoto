import { expect, test } from "vitest";
import { FORM_TEXT, mailtoFor, noScriptText, protocolText } from "../src/lib/source-form";

test("no visitor-facing sentence names GitHub or an issue", () => {
  const all = [...Object.values(FORM_TEXT).flatMap((v) => (typeof v === "string" ? [v] : Object.values(v))), protocolText(1), noScriptText("x@y")];
  for (const s of all) expect(s.toLowerCase()).not.toMatch(/github|issue/);
});

test("the mailto carries the subject and what the visitor typed", () => {
  const m = mailtoFor("abreovoto@gmail.com", { senador: "Marcio Bittar", url: "https://x.test/a", comentario: "minuto 2", correcao: false });
  const u = new URL(m);
  expect(u.protocol).toBe("mailto:");
  expect(u.pathname).toBe("abreovoto@gmail.com");
  expect(u.searchParams.get("subject")).toBe("Fonte: Marcio Bittar");
  expect(u.searchParams.get("body")).toBe("Senador(a): Marcio Bittar\nLink: https://x.test/a\nComentário: minuto 2\nCorreção do que o site mostra: não");
});

test("a site-wide correction has no senator line and the correction subject", () => {
  const u = new URL(mailtoFor("c@d", { senador: null, url: "https://x.test/", comentario: "", correcao: true }));
  expect(u.searchParams.get("subject")).toBe("Correção: site");
  expect(u.searchParams.get("body")).toBe("Link: https://x.test/\nCorreção do que o site mostra: sim");
});
