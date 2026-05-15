/**
 * P5 — Abstraction.
 *
 * If the source uses a specific term ("Python", "Postgres", "Docker") and
 * the rendered version replaces it with a generic abstraction
 * ("programming language", "database", "container runtime"), that is a
 * hit.  Pairs are loaded from `dictionaries/hypernyms.yaml`.
 *
 * The rule fires when ALL of the following hold:
 *   - the *specific* word is present in the source,
 *   - the *specific* word is NOT present in the rendered version,
 *   - the *abstract* word IS present in the rendered version.
 *
 * In "summarize" / "translate" tasks abstraction is acceptable, so the
 * rule is muted there.
 *
 * SPDX-License-Identifier: MIT
 */

import type { Hit, Rule, RuleContext } from "../types.js";

function present(text: string, word: string): boolean {
  // Whole-word match for ASCII; substring match for CJK (whose words have
  // no whitespace boundaries).
  if (/^[A-Za-z][A-Za-z0-9_+\-]*$/.test(word)) {
    const re = new RegExp(
      `(?:^|[^A-Za-z0-9_])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^A-Za-z0-9_])`,
      "i",
    );
    return re.test(text);
  }
  return text.includes(word);
}

export const p5Abstraction: Rule = {
  id: "P5",
  name: "abstraction",

  detect(source: string, rendered: string, ctx: RuleContext): Hit[] {
    if (ctx.task === "summarize" || ctx.task === "translate") return [];

    const hits: Hit[] = [];
    for (const pair of ctx.dictionaries.hypernymPairs) {
      const inSource = present(source, pair.specific);
      if (!inSource) continue;
      const stillSpecific = present(rendered, pair.specific);
      if (stillSpecific) continue;
      const becameAbstract = present(rendered, pair.abstract);
      if (!becameAbstract) continue;

      const idx = source.toLowerCase().indexOf(pair.specific.toLowerCase());
      hits.push({
        rule: "P5",
        ruleName: "abstraction",
        severity: "warn",
        message:
          `Rendered text replaced the specific term ${JSON.stringify(pair.specific)} ` +
          `with the abstraction ${JSON.stringify(pair.abstract)}.`,
        sourceSpan:
          idx >= 0
            ? {
                start: idx,
                end: idx + pair.specific.length,
                text: source.substr(idx, pair.specific.length),
              }
            : undefined,
        suggestion:
          "If the user said the specific name on purpose, keep it. Use " +
          "task='summarize' or 'translate' to mute this rule for whole-doc " +
          "compressions.",
      });
    }

    return hits;
  },
};
