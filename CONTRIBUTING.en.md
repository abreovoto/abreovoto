# Contributing

*[Versão em português](CONTRIBUTING.md)*

abreovoto is maintained by a single person under the name "Abre o Voto". The most
useful contribution is a **source**: a public link showing that a senator declared
their vote, or a correction to something the site shows. Code contributions are
welcome but small; open an issue first so we can talk before you write code.

## Sending a source or a correction

Use the **"Fonte ou correção"** issue template (in Portuguese, because that is who
it is for), or the form on the site, which opens the same kind of issue. What
counts as evidence is written on the site's methodology page and is the only
thing the maintainer will accept: a public video, a post on the senator's official
profile, a news article with a direct quote, an official note, or an e-mail from
the senator's institutional address. Screenshots of private messages and
second-hand accounts do not count.

What happens next: the maintainer checks the source, updates the data with a
commit that cites the issue, and closes it. The issue stays as the public record
of what was sent and what was decided.

## Issues

Open one when the site got something wrong (bug report) or when you want it to
do something it does not (feature request). The templates are a scaffold, not a
form; delete what does not apply.

Anything with a security impact does not go here. Report it privately through
**Security → Report a vulnerability** on this repository.

The `data` label marks anything that changes what the site asserts about a
senator: the files under `data/`, the evidence rule, the status model, the
ordering rule or the methodology page. Issues and pull requests carrying it are
read before anything else, because a mistake there is public the moment it
deploys.

When a pull request resolves an issue, its body says `Closes #N`, so the issue
closes on merge and the two stay linked.

## Ground rules

- What humans read in this repository is written in Portuguese: README, docs,
  templates, CHANGELOG, commit messages and the data. Code, code comments and
  build/CI configuration are in English.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `data:`, `chore:`, `ci:`), with the message in
  Portuguese. One commit per coherent change. `data:` is for changes under
  `data/`, and its message names the senator and cites the issue or source.
- Branches mirror the same vocabulary: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`,
  `chore/<slug>`, kebab-case. Data updates by the maintainer go straight to
  `main`.
- `main` is protected. Code changes land by pull request with a linear history
  (rebase merge).
- The gate is `npm run check`: data schema validation plus a full build. A
  "declared" entry without a candidate, a source URL and a literal quote fails it.

## Releases

Versions are annotated SemVer tags on `main` (`0.x` until the public launch,
`1.0.0` at launch). `CHANGELOG.md` keeps a "Não lançado" (unreleased) section
that every user-visible change adds a line to; a tag's message is that version's
changelog section, extracted rather than retyped:

```sh
v=0.1.0
{ printf 'abreovoto %s\n\n' "$v"
  awk -v v="$v" '$0 ~ "^## \\["v"\\]" {f=1; next} f && /^## / {exit} f' CHANGELOG.md
} | git tag -a --cleanup=whitespace "v$v" -F -
```

`--cleanup=whitespace` matters: the default strips every line beginning with
`#`, which is every Markdown heading in the section.

## No sign-off required

Contributions here are sources and small fixes, not code under a transfer of
rights, so commits do not need a `Signed-off-by` line. By contributing you agree
that your contribution is licensed under this repository's MIT license.
