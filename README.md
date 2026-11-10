# abreovoto

*[English version](README.en.md)*

Placar público da eleição para a Presidência do Senado Federal em 1º de fevereiro
de 2027. Para cada um dos 81 senadores, o site mostra o que se sabe em público
sobre o seu voto, com link para a fonte e o nível dela: declarou voto (a palavra
do próprio senador), apoio mapeado (uma fonte pública o cita pelo nome) ou apoio
pelo partido (anúncio do partido, da bancada ou da federação); ou que ainda não há
posição conhecida. Acima da lista: quantos têm e quantos não têm posição conhecida,
com a divisão por nível, e um card por candidato com o total de apoios e a mesma
divisão. O visitante escolhe seu estado, vê seus três senadores e compartilha um
card cobrando os que ainda não declararam.

O site não toma lado. Nunca diz em quem votar, trata todos os candidatos da mesma
forma e não publica nada sobre um senador sem fonte pública. Os dados vivem neste
repositório, então cada alteração é um commit que qualquer pessoa pode auditar.

**Situação:** o site está no ar em `https://abreovoto.com`, com o placar, os
candidatos, os três senadores de cada estado, a lista dos 81 com filtros, uma
página por senador, por estado e por candidato, as páginas "Como funciona",
"Metodologia" e "Privacidade" e os dados abertos em `/dados.json`. O card para
compartilhar ainda não existe. A divulgação começa quando o site estiver pronto
para isso, sem data marcada.

- Site: `https://abreovoto.com`
- Contato: abreovoto@gmail.com
- Fontes e correções: o formulário na página de cada senador (ou em `/fonte/`), sem cadastro; ou uma issue com o modelo "Fonte ou correção"
- Licença: MIT (código); dados do placar em CC BY 4.0

## Dados

Os dados ficam em `data/`, em YAML: `senadores.yaml`, `candidatos.yaml`,
`partidos.yaml`, `peticao.yaml` e `site.yaml`. As fotos oficiais ficam em `src/assets/fotos/`,
com o crédito registrado no YAML.

Cada senador tem um status: `nao_declarou`, `declarou`, `apoio_mapeado` (e, no
dia da eleição, `mostrou_na_sessao`). Todo status além de `nao_declarou` leva o
candidato, a data e a fonte: tipo, link `https` e o trecho literal. Sem fonte, a
validação recusa. `partidos.yaml` guarda os anúncios de apoio de partido, bancada
ou federação (o mais recente de cada partido vale; `candidato: null` libera a
bancada), e `recusa_partido`, no senador, registra com fonte quem disse que não
segue o partido. A posição que o site mostra é calculada desses dados, valendo o
nível mais alto: o voto mostrado na sessão, a declaração, o apoio mapeado (cada
candidato em campanha tem apoio mapeado a si mesmo, com o anúncio da candidatura
como fonte) e, por fim, o apoio do partido.

Cada estado tem três vagas: as vagas 1 e 2 têm mandato 2027–2035 e a vaga 3,
2023–2031. Quem deixa o mandato continua no arquivo como `deixou_mandato`,
apontando para quem assumiu, e o placar conta só os 81 em exercício. Quando a
saída já tem data marcada (um senador eleito governador, por exemplo), o
suplente entra na lista desde já, com `assume_em` igual ao `deixou_em` do
titular, e pode ter a sua declaração registrada antes de assumir.

- `npm run validate`: confere os dados contra as regras acima
- `npm run seed`: gera o `senadores.yaml` inicial a partir dos dados abertos do
  Senado (não sobrescreve um arquivo existente)
- `npm run fotos`: baixa e normaliza as fotos que ainda faltam (uma foto que já
  existe não é baixada de novo: ao trocar o `foto_origem`, apague o arquivo antigo)
- `npm run check`: validação, testes, verificação de tipos e build

## Site

O site é estático (Astro) e é servido por um único Worker do Cloudflare, que
entrega o build e responde em `/api/`. Para rodar localmente:

- `npm run dev`: o site em modo de desenvolvimento
- `npm run build` e depois `npx wrangler dev`: o build servido pelo Worker, com
  a API, como em produção

Os dados são publicados sob a licença CC BY 4.0.
