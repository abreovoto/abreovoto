# abreovoto

*[English version](README.en.md)*

Placar público da eleição para a Presidência do Senado Federal em 1º de fevereiro
de 2027. Para cada um dos 81 senadores, o site mostra se ele já declarou
publicamente em quem vota, com link para a fonte, ou se ainda não declarou. Acima
da lista: quantos não declararam, quantos declararam, e um card por candidato com
o número de declarações. O visitante escolhe seu estado, vê seus três senadores e
compartilha um card cobrando os que ainda não declararam.

O site não toma lado. Nunca diz em quem votar, trata todos os candidatos da mesma
forma e não publica nada sobre um senador sem fonte pública. Os dados vivem neste
repositório, então cada alteração é um commit que qualquer pessoa pode auditar.

**Situação:** os dados dos 81 senadores e a validação deles já estão neste
repositório; as páginas do site ainda não. O site entra no ar discretamente no
fim de novembro de 2026 e passa a ser divulgado a partir de janeiro de 2027.

- Site: `https://abreovoto.com` (ainda não está no ar)
- Contato: abreovoto@gmail.com
- Fontes e correções: abra uma issue com o modelo "Fonte ou correção"
- Licença: MIT (código); dados do placar em CC BY 4.0

## Dados

Os dados ficam em `data/`, em YAML: `senadores.yaml`, `candidatos.yaml`,
`peticao.yaml` e `site.yaml`. As fotos oficiais ficam em `src/assets/fotos/`,
com o crédito registrado no YAML.

Cada senador tem um status: `nao_declarou` ou `declarou` (e, no dia da eleição,
`mostrou_na_sessao`). Todo `declarou` leva o candidato, a data e a fonte: tipo,
link `https` e o trecho literal da declaração. Sem fonte, a validação recusa.

Cada estado tem três vagas: as vagas 1 e 2 têm mandato 2027–2035 e a vaga 3,
2023–2031. Quem deixa o mandato continua no arquivo como `deixou_mandato`,
apontando para quem assumiu, e o placar conta só os 81 em exercício.

- `npm run validate`: confere os dados contra as regras acima
- `npm run seed`: gera o `senadores.yaml` inicial a partir dos dados abertos do
  Senado (não sobrescreve um arquivo existente)
- `npm run fotos`: baixa e normaliza as fotos que ainda faltam (uma foto que já
  existe não é baixada de novo: ao trocar o `foto_origem`, apague o arquivo antigo)
- `npm run check`: validação, testes, verificação de tipos e build

Os dados são publicados sob a licença CC BY 4.0.
