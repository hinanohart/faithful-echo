# Contributing

Thanks for your interest.

## Adding a rule

A new rule belongs in `src/rules/pN_<short_name>.ts` and exports a
`Rule` object that conforms to `src/types.ts`.  Then:

1. Register it in `src/rules/index.ts` (in the `RULES` array) **and**
   add the new ID to the `byRule` initialiser.
2. Add unit tests in `tests/rules.test.ts` covering at least one
   positive case, one negative case, and one task-mute case if
   relevant.
3. Update `CHANGELOG.md` under `[Unreleased]`.
4. Update `agents/faithful-echo.md` so the agent prompt knows the new
   rule exists.

## Adding a dictionary entry

Edit the YAML file in `dictionaries/`.  Keep entries short and
unambiguous; borderline words (e.g. "very" as an intensifier) tend to
inflate false-positive rates and we prefer to leave them out.

## Code style

- Strict TypeScript (`strict: true`); no `any`.
- Single-purpose modules, one rule per file.
- No external runtime calls; the audit must remain offline.
- Tests live in `tests/`, fixtures must be **fictional** — `Alice`,
  `Bob`, `acme-corp`, etc.  The `leak-audit` CI job fails if any
  user-specific identifier slips into the repo.

## What not to add

- Network calls (telemetry, dictionary updates, anything online).
- A "rewrite" mode.  This tool diagnoses; rewriting belongs in a
  separate tool.
- Real NER / morphological analysis.  The whole point of the rule
  layer is to be deterministic and auditable; if you need real NLP,
  layer a different tool on top.
