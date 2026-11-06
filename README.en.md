# abreovoto

*[Versão em português](README.md)*

A public scoreboard for the election of the President of the Brazilian Senate on
1 February 2027. For each of the 81 senators it shows whether they have publicly
declared whom they will vote for, with a link to the source, or not. Above the
list: how many have not declared, how many have, and one card per candidate
with its number of declarations. Visitors pick their state, see their three
senators, and share a card asking the ones who have not declared to do so.

The site takes no side. It never says whom to vote for, treats every candidate
identically, and publishes nothing about a senator without a public source. The
data lives in this repository, so every change is a commit anyone can audit.

**Status:** the data on the 81 senators and its validation are in this
repository; the site's pages are not yet. The site goes live quietly at the end
of November 2026 and is promoted from January 2027.

- Site: `https://abreovoto.com` (not yet live)
- Contact: abreovoto@gmail.com
- Sources and corrections: open an issue with the "Fonte ou correção" template
- License: MIT (code); scoreboard data CC BY 4.0

## Data

The data lives in `data/`, as YAML: `senadores.yaml`, `candidatos.yaml`,
`peticao.yaml` and `site.yaml`. Official portraits live in `src/assets/fotos/`,
with their credit recorded in the YAML.

Each senator has a status: `nao_declarou` or `declarou` (and, on election day,
`mostrou_na_sessao`). Every `declarou` carries the candidate, the date and the
source: type, `https` link and the literal quote. Without a source, validation
rejects it.

Each state has three seats: seats 1 and 2 hold the 2027–2035 mandate and seat 3
the 2023–2031 one. A senator who leaves office stays in the file as
`deixou_mandato`, pointing to whoever took over, and the scoreboard counts only
the 81 in office.

- `npm run validate`: checks the data against the rules above
- `npm run seed`: writes the initial `senadores.yaml` from the Senate's open
  data (never overwrites an existing file)
- `npm run fotos`: downloads and normalises any missing portraits (an existing
  file is never fetched again: when `foto_origem` changes, delete the old file)
- `npm run check`: validation, tests, type checking and build

The data is published under CC BY 4.0.
