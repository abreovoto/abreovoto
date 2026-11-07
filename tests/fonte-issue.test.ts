import { expect, test } from "vitest";
import { CORRECAO_TITLE, fence, issueFor, parseSubmission } from "../worker/fonte-issue";
import { CORRECAO_SUBJECT } from "../src/lib/source-form";

const ids = new Set(["marcio-bittar", "flavio-dino"]);
const ok = { senador: "marcio-bittar", url: "https://g1.globo.com/x?y=1#t=120", comentario: " minuto 2 ", correcao: "on", token: "tok" };
const seat = { id: "marcio-bittar", nome: "Marcio Bittar", partido: "PL", uf: "AC", pagina: "https://abreovoto.com/senador/marcio-bittar/" };

test("a complete submission parses, trimmed, with the checkbox as a boolean", () => {
  expect(parseSubmission(ok, ids)).toEqual({ senador: "marcio-bittar", url: "https://g1.globo.com/x?y=1#t=120", comentario: "minuto 2", correcao: true, token: "tok" });
});

test.each([
  ["http://g1.globo.com/x", "url"], ["g1.globo.com/x", "url"], ["https://g1.globo.com/a b", "url"], ["javascript:alert(1)", "url"],
  [`https://g1.globo.com/${"a".repeat(2000)}`, "url"],
])("%s is refused as a url", (url, campo) => {
  expect(parseSubmission({ ...ok, url }, ids)).toEqual({ campo });
});

test.each([["", "senador"], [undefined, "senador"], ["nobody", "senador"], [7, "senador"]])("senador %s is refused", (senador, campo) => {
  expect(parseSubmission({ ...ok, senador }, ids)).toEqual({ campo });
});

test("a departed senator's id and the literal site are accepted; a long comment and a missing token are not", () => {
  expect((parseSubmission({ ...ok, senador: "flavio-dino" }, ids) as { senador: string }).senador).toBe("flavio-dino");
  expect((parseSubmission({ ...ok, senador: "site" }, ids) as { senador: string }).senador).toBe("site");
  expect(parseSubmission({ ...ok, comentario: "x".repeat(1001) }, ids)).toEqual({ campo: "comentario" });
  expect(parseSubmission({ ...ok, token: "" }, ids)).toEqual({ campo: "token" });
});

test("the issue is framed, links the page, fences the comment and mentions nobody", () => {
  const sub = { senador: "marcio-bittar", url: "https://g1.globo.com/x", comentario: "veja @alguem #12 ``` <b>oi</b>", correcao: false, token: "t" };
  const issue = issueFor(sub, seat, new Date("2026-11-07T14:05:30Z"));
  expect(issue.title).toBe("Fonte enviada: Marcio Bittar (PL-AC)");
  expect(issue.labels).toEqual(["data"]);
  expect(issue.body.startsWith("Enviado pelo formulário do site em 2026-11-07 14:05 UTC. **Não verificado**: só entra no placar depois da regra da [Metodologia](https://abreovoto.com/metodologia/).")).toBe(true);
  expect(issue.body).toContain("Senador(a): [Marcio Bittar](https://abreovoto.com/senador/marcio-bittar/)");
  expect(issue.body).toContain("Fonte: https://g1.globo.com/x");
  expect(issue.body).toContain("Correção do que o site mostra: não");
  expect(issue.body).toContain("Comentário:\n````\nveja @alguem #12 ``` <b>oi</b>\n````");
  expect(issue.body.indexOf("@alguem")).toBeGreaterThan(issue.body.indexOf("````"));
});

test("a site-wide correction without a comment has no comment block and the correction title", () => {
  const issue = issueFor({ senador: "site", url: "https://x.test/", comentario: "", correcao: true, token: "t" }, null, new Date("2026-11-07T00:00:00Z"));
  expect(issue.title).toBe(CORRECAO_SUBJECT);
  expect(issue.body).toContain("Sobre: o site");
  expect(issue.body).not.toContain("Comentário:");
  expect(issue.body).toContain("Correção do que o site mostra: sim");
});

test("the worker's correction title and the page's correction mail subject are the same string", () => {
  expect(CORRECAO_TITLE).toBe(CORRECAO_SUBJECT);
});

test("the fence is one backtick longer than the longest run, three at least", () => {
  expect(fence("oi")).toBe("```");
  expect(fence("a ``` b")).toBe("````");
  expect(fence("`````")).toBe("``````");
});
