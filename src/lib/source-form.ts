/**
 * Every sentence the source form shows a visitor, and the e-mail it falls back to. The page,
 * the client script and the tests read the same strings from here.
 */

export const FORM_TEXT = Object.freeze({
  title: "Ajude a manter o placar em dia",
  shortcutLink: "Avise",
  urlLabel: "Link da fonte",
  urlHint:
    "Vídeo, post no perfil oficial, matéria com a fala entre aspas ou nota oficial. Se for vídeo, diga o minuto no comentário.",
  commentLabel: "Comentário",
  commentHint: "O que a fonte mostra. Se tiver, copie a frase exata do senador.",
  correctionLabel: "É uma correção do que o site mostra",
  senatorLabel: "Senador(a)",
  choose: "Escolha",
  notAboutASenator: "Não é sobre um senador",
  submit: "Enviar",
  verifying: "Verificando…",
  publicNote: "O link e o comentário ficam públicos, com número de protocolo. Não envie dados pessoais.",
  receivedSenator:
    "Recebido. Conferimos pela regra da Metodologia; se a fonte entrar, aparece na página do senador em até 24 horas.",
  receivedSite: "Recebido. Conferimos e, se a correção entrar, o site é atualizado em até 24 horas.",
  transient: "Não conseguimos registrar agora. Tente de novo em instantes.",
  definitive: "Não conseguimos registrar por aqui. Envie por e-mail:",
  field: Object.freeze({
    url: "Cole o link completo, começando com https://",
    comentario: "O comentário passa de 1.000 caracteres.",
    senador: "Escolha o senador ou marque que não é sobre um senador.",
  }),
});

/** The section's first paragraph: the same for every senator, or for the site as a whole. */
export const introText = (nome: string | null): string =>
  `O placar é atualizado com a ajuda de quem acompanha. Se ${nome ?? "um senador"} declarou em público o voto para presidente do Senado, mudou de posição, ou se algo ${nome === null ? "no site" : "nesta página"} está errado, mande o link de onde viu. Conferimos pela regra da Metodologia antes de mudar o placar.`;

/** The line under a senator's status that leads to the form. */
export const shortcutText = (nome: string): string => `Viu ${nome} declarar ou mudar o voto?`;

export const protocolText = (n: number): string => `Protocolo ${n}`;

export const noScriptText = (contato: string): string => `Para enviar uma fonte, escreva para ${contato}.`;

/** What the visitor typed; `senador` is the display name, or null when it is about the site. */
export type Draft = { senador: string | null; url: string; comentario: string; correcao: boolean };

/** The Worker keeps its own copy of these two; a test holds them equal. */
export const CORRECAO_SUBJECT = "Correção: site";
export const fonteSubject = (nome: string): string => `Fonte: ${nome}`;

export function mailtoFor(contato: string, d: Draft): string {
  const subject = d.senador === null ? CORRECAO_SUBJECT : fonteSubject(d.senador);
  const lines = [
    ...(d.senador === null ? [] : [`Senador(a): ${d.senador}`]),
    `Link: ${d.url}`,
    ...(d.comentario === "" ? [] : [`Comentário: ${d.comentario}`]),
    `Correção do que o site mostra: ${d.correcao ? "sim" : "não"}`,
  ];
  return `mailto:${contato}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
