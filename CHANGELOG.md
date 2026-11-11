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
- Cartão de cada senador e de cada candidato, gerado a cada atualização, e o cartão da campanha na home, mostrados como prévia quando um link do site é compartilhado no X, no WhatsApp e em outras redes. O link de cada senador compartilhado pelo site muda quando a posição dele muda, para a prévia acompanhar. O cartão da home traz o mote da campanha e o placar do dia, com a foto e o total de cada candidato e quantos senadores estão sem posição, sempre com a data, para que uma prévia antiga mostre um retrato datado e não um número que pareça de hoje.
- No placar da home, um botão que copia um texto pronto para postar: o mote da campanha, o convite a ver e perguntar aos senadores do seu estado, o link do site com a versão do cartão do dia (para que um post novo mostre a prévia com o placar atual) e a hashtag.
- Na página de cada senador, botões para cobrar a declaração no X, compartilhar no WhatsApp, copiar o link e baixar o cartão, e, no celular, compartilhar o cartão com o texto pelo menu de compartilhamento do aparelho; a página também mostra o placar e a petição a quem chega por ela. Nos cartões de senador da home e das páginas por estado, o botão do X.
- Formulário para enviar a fonte de uma declaração ou uma correção, na página de cada senador e em `/fonte/`, sem cadastro, nome ou e-mail: o envio vira um registro público com número de protocolo, conferido antes de entrar no placar. Antes da declaração, o convite pede a fonte de onde o senador disse em quem vota; depois, pede uma fonte mais direta, uma mudança de posição ou um erro.
- Petição no Change.org pedindo que os senadores declarem o voto: botão para assinar na home e na página de cada senador, e, na home, o número de assinaturas, atualizado a cada 15 minutos a partir de 500.
- `/dados.json` passa a trazer o endereço da petição.
- O placar sai com as declarações já públicas, cada uma com sua fonte e o trecho literal entre aspas.
- O site é gerado de novo todo dia, logo depois da meia-noite de Brasília, mesmo sem mudança nos dados: a data do placar, o `gerado_em` de `/dados.json` e as frases de quem assume ou deixa uma vaga acompanham o calendário.

### Alterado

- A home abre com "O seu voto é secreto. O deles não precisa ser."; a data da eleição e o voto secreto vão para o subtítulo.
- O cartão da home, mostrado como prévia quando o link do site é compartilhado, passa a dizer que é um link: um botão "Clique e cobre o seu senador", a pergunta "O seu senador já abriu o voto?" e um convite a compartilhar. O canto inferior esquerdo fica livre para o título que o X sobrepõe à imagem.
- A petição ganha um bloco próprio na home, com botão largo, e aparece de novo depois da lista dos senadores. Na home e na página de cada senador, ela abre em nova aba.
- A lista dos senadores passa a se chamar "Escolha um senador para cobrar", e cada linha termina num botão: "Cobrar" para quem não declarou, "Ver fonte" para quem declarou.
- O placar passa a contar três níveis de apoio, cada um com uma fonte pública: declarou voto (a palavra do próprio senador), apoio mapeado (uma fonte pública cita o senador pelo nome) e apoio pelo partido ou pela federação (anúncio do partido, da bancada no Senado ou da federação). Vale o nível mais alto de cada senador. Para declarar, basta que o apoio seja do próprio senador e que a fonte deixe claro que se trata da eleição para a Presidência do Senado; não é preciso a frase "voto em". Quem lança a própria candidatura aparece com apoio mapeado a si mesmo, com o anúncio da candidatura como fonte; o apoio do partido deixa de valer para quem disser em público que não o segue, e para todos quando o partido libera a bancada. A metodologia descreve os níveis.
- A home mostra "sem posição conhecida" e "com posição conhecida", com a divisão por nível no hemiciclo e numa legenda; cada candidato mostra o total de apoios e a mesma divisão, e a página do candidato lista os senadores por nível. O selo, a página e o cartão de cada senador dizem o nível e de quem é a fonte.
- Quem tem apoio mapeado ou pelo partido continua com o botão "Cobrar", e os textos para o X e o WhatsApp pedem que confirme em público. A lista dos senadores ganha os filtros "Sem posição", "Apoio mapeado" e "Pelo partido". O formulário de fonte aceita também matérias ou listas que citem o senador pelo nome e anúncios de partido, bancada ou federação.
- Para quem tem apoio mapeado ou pelo partido, os textos para o X e o WhatsApp perguntam com gentileza se o voto será naquele candidato ("nele" ou "nela", conforme o candidato) e lembram que uma resposta direta ajuda os eleitores do estado do senador, nomeado no texto, a acompanhar. No apoio mapeado, o texto diz que o placar registra o apoio com fonte pública, mas que o voto ainda não foi dito de forma direta.
- `/dados.json` traz, para cada senador, a `posicao` em vigor (nível, candidato, data, origem e fonte) ao lado da `declaracao` registrada, e, no placar, `sem_posicao`, `com_posicao`, `apoio_mapeado`, `pelo_partido` e a divisão por nível de cada candidato. `declararam` e `nao_declararam` mantêm o significado: a palavra do próprio senador.
