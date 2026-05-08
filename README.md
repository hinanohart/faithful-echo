# faithful-echo

> Detect where the LLM softened, paraphrased, hedged, or numerically
> rounded the user's original wording.  A Claude Code agent + standalone
> CLI.

[![ci](https://github.com/hinanohart/faithful-echo/actions/workflows/ci.yml/badge.svg)](https://github.com/hinanohart/faithful-echo/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

When an LLM rewrites your words — when summarising a complaint, restating
requirements, condensing a bug report, or "echoing back" instructions —
it tends to drift along seven well-known axes:

| ID | Drift                | Example (source → rendered)                                                        |
| -- | -------------------- | ---------------------------------------------------------------------------------- |
| P1 | entity drift         | `Postgres` → `database`, `Alice` → `someone`                                       |
| P2 | numeric drift        | `73.4 seconds` → `about 70 seconds`, `3.11` → `3`                                  |
| P3 | quantifier drop      | `absolutely required` → `required`, `絶対` → ∅                                     |
| P4 | hedge insertion      | `it is required` → `it might be required`, ∅ → `おそらく`                            |
| P5 | abstraction          | `Python` → `programming language`, `Postgres` → `database`                         |
| P6 | subject swap         | `I deployed it` → `the user deployed it`                                           |
| P7 | tone smoothing       | `must read` → `should consider reading`, `禁止` → `推奨`, `Stop!` → `Please stop.`  |

`faithful-echo` is the smallest tool that reports each of these drifts
deterministically, so a human (or a downstream judge) can decide which
ones matter for the task at hand.  It does **not** rewrite or fact-check;
diagnosis only.

---

## 30-second install

```bash
git clone https://github.com/hinanohart/faithful-echo.git
cd faithful-echo
npm install
npm run build
```

This produces `dist/cli.js` (the standalone CLI).  Requires Node ≥ 20.

To use as a Claude Code agent, copy `agents/faithful-echo.md` into your
`~/.claude/agents/` directory.  The agent's prompt tells it how to call
the CLI.

---

## CLI usage

```bash
node dist/cli.js check \
  --source   path/to/source.txt   \
  --rendered path/to/rendered.txt \
  --task     verbatim_quote       \
  --format   pretty
```

Flags:

| Flag                      | Default          | Notes                                                                              |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `-s, --source <path>`     | (required)       | Source / original text. `-` reads from stdin.                                      |
| `-r, --rendered <path>`   | (required)       | LLM's rendered version. `-` reads from stdin (one of the two only).                |
| `-t, --task <kind>`       | `verbatim_quote` | `verbatim_quote` / `paraphrase` / `summarize` / `translate`.                       |
| `-l, --lang <code>`       | `auto`           | `auto` / `ja` / `en`. Currently only auto and the dictionaries differ per locale.  |
| `-f, --format <fmt>`      | `pretty`         | `pretty` (human) or `json` (strict).                                               |
| `-d, --dictionaries <d>`  | bundled          | Override dictionary directory; use to load project-specific lists.                 |

Exit codes:

- `0` — no hits, or only `info`-severity hits
- `1` — at least one `warn`
- `2` — at least one `error` (e.g. P2 numeric drift)

---

## Programmatic API

```ts
import { audit, loadDictionaries } from "faithful-echo";

const report = audit(source, rendered, {
  task: "verbatim_quote",
  lang: "auto",
  dictionaries: loadDictionaries(),
});

for (const hit of report.hits) {
  console.log(hit.rule, hit.severity, hit.message);
}
```

`audit()` is a pure function.  Each rule lives in its own module under
`src/rules/`.

---

## Task-kind semantics

The `task` flag tells the rules how strict to be.

| Task              | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
| ----------------- | -- | -- | -- | -- | -- | -- | -- |
| `verbatim_quote`  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `paraphrase`      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `summarize`       | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `translate`       | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

Severity is set by each rule (P2 is `error`; most are `warn`; P6's
defaults to `info`).  The CLI's exit code is the worst severity seen.

---

## How it differs from related tools

| Tool                                 | Purpose                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `faithful-echo` (this)               | Deterministic source-vs-rendered drift detection.  Diagnoses, does not fix.   |
| LLM-as-judge (DeepEval, Promptfoo)   | Judges by asking another LLM, no source ground truth needed.                  |
| Generic critic agents                | Score quality / completeness; not focused on user-faithfulness specifically.  |
| `diff` / `git diff --word-diff`      | Lexical diff; doesn't classify drifts by *kind*.                              |

We layer on top of the rule output to give you a hit-by-rule structure
that tools like the above can ingest.

---

## Testing

```bash
npm test           # vitest, 29 unit tests
npm run typecheck  # tsc --noEmit, strict mode
```

CI also runs an end-to-end CLI smoke (drift → exit 2; clean → exit 0)
and an `npm pack` shape check that fails if the bundled tarball would
be missing the agent file or the dictionaries.

---

## Limitations (read these)

- **Heuristic, not semantic.**  Rules are regex / dictionary based.
  Synonym substitution and word-order changes are not detected.  Long
  outputs from chatty models will produce many small hits — cluster
  them by rule.
- **Dictionaries are intentionally small.**  Borderline intensifiers
  ("very") and ambiguous hypernyms inflate false positives, so we
  err on the side of leaving them out.  Override with
  `--dictionaries`.
- **Bilingual but not multilingual.**  Japanese and English have
  decent default coverage; other languages will pass through with
  P1 / P2 / P3 / P4 doing useful work and P5 / P6 / P7 mostly idle.
- **Not a fact-checker.**  P2 catches changes in *the numbers
  present*, not whether the numbers were correct in the first place.
- **Not a rewriter.**  By design.  If you want the rendered version
  fixed, feed the report back to your LLM as instructions.

---

## License

[Apache-2.0](LICENSE).
