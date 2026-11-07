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

**Status:** the site is live at `https://abreovoto.com`, with the scoreboard,
the candidates, each state's three senators, the list of 81 with filters, one
page per senator, per state and per candidate, the "Como funciona",
"Metodologia" and "Privacidade" pages, and open data at `/dados.json`. The card
to share does not exist yet. Promotion starts when the site is ready for it; no
date is set.

- Site: `https://abreovoto.com`
- Contact: abreovoto@gmail.com
- Sources and corrections: the form on each senator page (or at `/fonte/`), no sign-up; or an issue with the "Fonte ou correção" template
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
the 81 in office. When the departure already has a set date (a senator
elected governor, for example), the substitute is listed right away, with
`assume_em` equal to the holder's `deixou_em`, and can have a declaration
recorded before taking the seat.

- `npm run validate`: checks the data against the rules above
- `npm run seed`: writes the initial `senadores.yaml` from the Senate's open
  data (never overwrites an existing file)
- `npm run fotos`: downloads and normalises any missing portraits (an existing
  file is never fetched again: when `foto_origem` changes, delete the old file)
- `npm run check`: validation, tests, type checking and build

## Site

The site is static (Astro) and is served by a single Cloudflare Worker, which
delivers the build and answers under `/api/`. To run it locally:

- `npm run dev`: the site in development mode
- `npm run build`, then `npx wrangler dev`: the build served by the Worker, with
  the API, as in production

The data is published under CC BY 4.0.
