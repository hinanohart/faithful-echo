/**
 * P3 — Quantifier drop.
 *
 * If the source uses an intensifier ("absolutely", "絶対", "extremely",
 * "極めて", …) and the rendered version does not, the rendered version
 * is weaker than the user's original phrasing — that's a hit.
 *
 * For "summarize" tasks this rule is muted, since dropping intensifiers
 * is part of summarising.
 *
 * SPDX-License-Identifier: MIT
 */

import type { Hit, Rule, RuleContext } from "../types.js";

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAny(text: string, words: string[]): string | null {
  for (const w of words) {
    if (!w) continue;
    // Case-insensitive only for ASCII, since JS i flag handles that.
    const re = new RegExp("(?:^|[^A-Za-z])" + escape(w) + "(?:$|[^A-Za-z])", "i");
    if (re.test(text)) return w;
  }
  return null;
}

export const p3QuantifierDrop: Rule = {
  id: "P3",
  name: "quantifier drop",

  detect(source: string, rendered: string, ctx: RuleContext): Hit[] {
    if (ctx.task === "summarize") return [];

    const words = [
      ...ctx.dictionaries.quantifiers.ja,
      ...ctx.dictionaries.quantifiers.en,
    ];

    const hits: Hit[] = [];
    for (const w of words) {
      if (!source.includes(w) && !new RegExp(escape(w), "i").test(source)) {
        continue;
      }
      // The word is in the source.  Is it still in the rendered text?
      const inSource = containsAny(source, [w]);
      if (!inSource) continue;
      const inRendered = containsAny(rendered, [w]);
      if (inRendered) continue;

      const idx = source.indexOf(w);
      hits.push({
        rule: "P3",
        ruleName: "quantifier drop",
        severity: "warn",
        message:
          `Intensifier ${JSON.stringify(w)} from the source is missing ` +
          "from the rendered version.",
        sourceSpan:
          idx >= 0
            ? { start: idx, end: idx + w.length, text: w }
            : undefined,
        suggestion:
          "If the assistant softened on purpose, mark the task as " +
          "'summarize' or 'paraphrase'; otherwise restore the intensifier.",
      });
    }

    return hits;
  },
};
