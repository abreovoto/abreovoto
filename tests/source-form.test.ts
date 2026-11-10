import { expect, test } from "vitest";
import { FORM_TEXT, introText, mailtoFor, noScriptText, protocolText, shortcutText } from "../src/lib/source-form";

test("no visitor-facing sentence names GitHub or an issue", () => {
  const all = [...Object.values(FORM_TEXT).flatMap((v) => (typeof v === "string" ? [v] : Object.values(v))), protocolText(1), noScriptText("x@y"), introText("X", false), introText("X", true), introText(null), shortcutText("X", false), shortcutText("X", true)];
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

test("the section invites help, says what to send and that nothing changes unchecked", () => {
  expect(FORM_TEXT.title).toBe("Ajude a manter o placar em dia");
  expect(introText(null)).toBe(
    "O placar é atualizado com a ajuda de quem acompanha. Se um senador declarou em público o voto para presidente do Senado, mudou de posição, ou se algo no site está errado, mande o link de onde viu. Também vale uma matéria ou lista que cite um senador pelo nome como apoio a um candidato, ou o anúncio de apoio de um partido, de uma bancada ou de uma federação. Conferimos pela regra da Metodologia antes de mudar o placar.",
  );
  expect(FORM_TEXT.shortcutLink).toBe("Avise");
});

test("before a declaration, the section asks whether the senator has already said it", () => {
  expect(introText("Marcio Bittar", false)).toBe(
    "O placar é atualizado com a ajuda de quem acompanha. Se você viu Marcio Bittar dizer em público em quem vota para presidente do Senado, mande o link de onde viu: um vídeo, um post no perfil oficial ou uma matéria com a fala entre aspas. Se algo nesta página está errado, avise também. Conferimos pela regra da Metodologia antes de mudar o placar.",
  );
  expect(shortcutText("Marcio Bittar", false)).toBe("Viu Marcio Bittar declarar o voto?");
});

test("after a declaration, the section asks for a stronger source, a change or an error", () => {
  expect(introText("Marcio Bittar", true)).toBe(
    "Marcio Bittar já declarou o voto, com a fonte mostrada acima. Você pode ajudar a deixar esse registro mais forte: se conhece uma fonte mais direta da mesma declaração, como o vídeo original, um post no perfil oficial ou a frase completa, mande o link. Se Marcio Bittar mudou de posição, ou se algo nesta página está errado, avise também. Conferimos pela regra da Metodologia antes de mudar o placar.",
  );
  expect(shortcutText("Marcio Bittar", true)).toBe("Tem uma fonte melhor, ou viu Marcio Bittar mudar o voto?");
});

test("each intro names the methodology exactly once, where the page puts the link", () => {
  for (const t of [introText(null), introText("X", false), introText("X", true)]) expect(t.split("Metodologia")).toHaveLength(2);
});
