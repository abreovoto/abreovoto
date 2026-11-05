# Como contribuir

*[English version](CONTRIBUTING.en.md)*

O abreovoto é mantido por uma única pessoa, sob o nome "Abre o Voto". A
contribuição mais útil é uma **fonte**: um link público mostrando que um senador
declarou o voto, ou uma correção de algo que o site mostra. Contribuições de código
são bem-vindas, mas pequenas; abra uma issue antes para a gente conversar.

## Enviando uma fonte ou uma correção

Use o modelo de issue **"Fonte ou correção"**, ou o formulário do próprio site, que
abre o mesmo tipo de issue. O que vale como evidência está escrito na página
Metodologia do site e é a única coisa que o mantenedor aceita: vídeo público, post
no perfil oficial do senador, matéria com citação direta, nota oficial, ou e-mail
do endereço institucional do senador. Print de conversa privada e relato de
terceiros não contam.

O que acontece depois: o mantenedor confere a fonte, atualiza os dados com um
commit que cita a issue e a fecha. A issue fica como registro público do que foi
enviado e do que foi decidido.

## Issues

Abra uma quando o site errou em algo (bug) ou quando você quer que ele faça algo
que não faz (sugestão). Os modelos são um roteiro, não um formulário; apague o
que não se aplica.

Qualquer coisa com impacto de segurança não vai aqui. Reporte em privado por
**Security → Report a vulnerability** neste repositório.

O rótulo `data` marca tudo que muda o que o site afirma sobre um senador: os
arquivos em `data/`, a regra de evidência, o modelo de status, a regra de
ordenação ou a página de metodologia. Issues e pull requests com esse rótulo são
lidos antes de qualquer outro, porque um erro ali é público no instante em que
entra no ar.

Quando um pull request resolve uma issue, o corpo dele diz `Closes #N`, para a
issue fechar no merge e as duas ficarem ligadas.

## Regras

- O que humanos leem neste repositório é escrito em português: README,
  documentação, modelos, CHANGELOG, mensagens de commit e os dados. O código, os
  comentários no código e a configuração de build e CI são em inglês.
- Commits seguem o [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `data:`, `chore:`, `ci:`), com a mensagem em
  português. Um commit por mudança coerente. `data:` é para mudanças em `data/`,
  e a mensagem nomeia o senador e cita a issue ou a fonte.
- Branches seguem o mesmo vocabulário: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`,
  `chore/<slug>`, em kebab-case. Atualizações de dados pelo mantenedor vão direto
  para a `main`.
- A `main` é protegida. Mudanças de código entram por pull request com histórico
  linear (rebase merge).
- O gate é `npm run check`: validação do schema dos dados mais o build completo.
  Uma entrada "declarou" sem candidato, URL da fonte e trecho literal falha nele.

## Versões

Versões são tags anotadas SemVer na `main` (`0.x` até o lançamento público,
`1.0.0` no lançamento). O `CHANGELOG.md` mantém uma seção "Não lançado" onde toda
mudança visível ganha uma linha; a mensagem da tag é a seção daquela versão no
changelog, extraída em vez de redigitada:

```sh
v=0.1.0
{ printf 'abreovoto %s\n\n' "$v"
  awk -v v="$v" '$0 ~ "^## \\["v"\\]" {f=1; next} f && /^## / {exit} f' CHANGELOG.md
} | git tag -a --cleanup=whitespace "v$v" -F -
```

O `--cleanup=whitespace` importa: o padrão remove toda linha que começa com `#`,
que é todo título Markdown da seção.

## Sem sign-off

As contribuições aqui são fontes e pequenas correções, não código sob cessão de
direitos, então os commits não precisam de linha `Signed-off-by`. Ao contribuir,
você concorda que sua contribuição é licenciada sob a licença MIT deste
repositório.
