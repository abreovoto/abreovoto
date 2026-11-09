# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e
o projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

Nada foi publicado ainda e nenhuma versão foi marcada, então toda entrada fica
em "Não lançado". `0.x` é o site antes do lançamento público; `1.0.0` é o
lançamento.

## [Não lançado]

### Adicionado

- Dados dos 81 senadores, dos candidatos e validação do schema.
- Identidade visual do site: paleta clara e escura, tipografia, marca e os componentes do placar.
- Site no ar em abreovoto.com: home com o placar, os candidatos, os três senadores do seu estado e a lista dos 81 com filtros; página de cada senador com a declaração e o histórico; páginas por estado e por candidato; como funciona, metodologia, privacidade e dados abertos em `/dados.json`.
- Cartão de cada senador e de cada candidato, gerado a cada atualização, e o cartão da campanha na home, mostrados como prévia quando um link do site é compartilhado no X, no WhatsApp e em outras redes. O link de cada senador compartilhado pelo site muda quando a declaração muda, para a prévia acompanhar; o cartão da home não traz número nem data, para nunca ficar desatualizado.
- Na página de cada senador, botões para cobrar a declaração no X, compartilhar no WhatsApp, copiar o link e baixar o cartão, e, no celular, compartilhar o cartão com o texto pelo menu de compartilhamento do aparelho; a página também mostra o placar e a petição a quem chega por ela. Nos cartões de senador da home e das páginas por estado, o botão do X.
- Formulário para enviar a fonte de uma declaração ou uma correção, na página de cada senador e em `/fonte/`, sem cadastro, nome ou e-mail: o envio vira um registro público com número de protocolo, conferido antes de entrar no placar. Antes da declaração, o convite pede a fonte de onde o senador disse em quem vota; depois, pede uma fonte mais direta, uma mudança de posição ou um erro.
- Petição no Change.org pedindo que os senadores declarem o voto: botão para assinar na home e na página de cada senador, e, na home, o número de assinaturas, atualizado a cada 15 minutos a partir de 500.
- `/dados.json` passa a trazer o endereço da petição.
- O placar sai com as declarações já públicas, cada uma com sua fonte e o trecho literal entre aspas.
- A metodologia diz quando o apoio declarado conta como dizer em quem vota: com o nome do candidato e a eleição na própria citação.
- O site é gerado de novo todo dia, logo depois da meia-noite de Brasília, mesmo sem mudança nos dados: a data do placar, o `gerado_em` de `/dados.json` e as frases de quem assume ou deixa uma vaga acompanham o calendário.

### Alterado

- A home abre com "O seu voto é secreto. O deles não precisa ser."; a data da eleição e o voto secreto vão para o subtítulo.
- A petição ganha um bloco próprio na home, com botão largo, e aparece de novo depois da lista dos senadores. Na home e na página de cada senador, ela abre em nova aba.
- A lista dos senadores passa a se chamar "Escolha um senador para cobrar", e cada linha termina num botão: "Cobrar" para quem não declarou, "Ver fonte" para quem declarou.
