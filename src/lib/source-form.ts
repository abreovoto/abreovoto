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

/**
 * The section's first paragraph. For the site as a whole it covers everything; on a senator's
 * page it depends only on whether the senator has declared: before, it asks whether they have
 * already said it; after, it asks for a stronger source, a change of position or an error. The
 * same two texts for every senator.
 */
export function introText(nome: string | null, declared = false): string {
  const check = "Conferimos pela regra da Metodologia antes de mudar o placar.";
  if (nome === null)
    return `O placar é atualizado com a ajuda de quem acompanha. Se um senador declarou em público o voto para presidente do Senado, mudou de posição, ou se algo no site está errado, mande o link de onde viu. Também vale uma matéria ou lista que cite um senador pelo nome como apoio a um candidato, ou o anúncio de apoio de um partido, de uma bancada ou de uma federação. ${check}`;
  return declared
    ? `${nome} já declarou o voto, com a fonte mostrada acima. Você pode ajudar a deixar esse registro mais forte: se conhece uma fonte mais direta da mesma declaração, como o vídeo original, um post no perfil oficial ou a frase completa, mande o link. Se ${nome} mudou de posição, ou se algo nesta página está errado, avise também. ${check}`
    : `O placar é atualizado com a ajuda de quem acompanha. Se você viu ${nome} dizer em público em quem vota para presidente do Senado, mande o link de onde viu: um vídeo, um post no perfil oficial ou uma matéria com a fala entre aspas. Se algo nesta página está errado, avise também. ${check}`;
}

/** The line under a senator's status that leads to the form, in the same two cases. */
export const shortcutText = (nome: string, declared = false): string =>
  declared ? `Tem uma fonte melhor, ou viu ${nome} mudar o voto?` : `Viu ${nome} declarar o voto?`;

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
