# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-08

### Added
- Initial release.
- Seven deterministic rules in `src/rules/`:
  - **P1** entity drift (proper-noun missing or replaced)
  - **P2** numeric drift (number missing or rounded; severity `error`)
  - **P3** quantifier drop (intensifier missing; muted on `summarize`)
  - **P4** hedge insertion (rendered version softens with hedges)
  - **P5** abstraction (specific term replaced by hypernym; muted on
    `summarize` / `translate`)
  - **P6** subject swap (first-person → reattribution; muted on
    `translate`)
  - **P7** tone smoothing (categorical → suggestion; missing exclamation
    marks)
- Bilingual heuristic tokenizer (Latin / katakana / hiragana / kanji /
  number with comma grouping).
- Dictionaries shipped in YAML under `dictionaries/`:
  - `quantifiers.yaml` — strong intensifiers, ja + en
  - `hedges.yaml`      — modal/epistemic/approximation hedges, ja + en
  - `hypernyms.yaml`   — specific → abstract pairs (programming languages,
    databases, frameworks, colors, animals, units of time)
- `faithful-echo` CLI (`dist/cli.js`) with `check` subcommand:
  - inputs from files or stdin (`-`),
  - tasks: `verbatim_quote` / `paraphrase` / `summarize` / `translate`,
  - output formats: `pretty` (human) / `json` (strict),
  - exit codes: 0 = clean / info-only, 1 = warnings, 2 = errors.
- Claude Code agent file `agents/faithful-echo.md` with a tightly-scoped
  description (verification only — no rewriting, no synthesising the
  source).
- Programmatic API exposed from `src/index.ts`.
- 29 unit tests covering each rule's positive and negative cases plus
  task-kind muting.
- CI matrix on Ubuntu and macOS for Node.js 20 / 22, with:
  - typecheck (strict mode),
  - test suite,
  - end-to-end CLI smoke (drift case → exit 2; clean case → exit 0),
  - `npm pack` shape check (refuses to ship without `dist/cli.js`,
    the agent file, or the dictionaries),
  - leak-audit job that fails on any likely user-specific identifier.
