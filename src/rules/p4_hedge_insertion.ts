/**
 * P4 — Hedge insertion.
 *
 * If the rendered version introduces a hedge ("perhaps", "kamoshirenai",
 * "it might be") that wasn't in the source, the model has softened the
 * user's claim.  That's a hit.
 *
 * License: Apache-2.0
 */

import type { Hit, Rule, RuleContext } from "../types.js";

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findInRendered(
  rendered: string,
  hedge: string,
): { start: number; end: number } | null {
  const re = new RegExp(escape(hedge), "i");
  const m = re.exec(rendered);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}

export const p4HedgeInsertion: Rule = {
  id: "P4",
  name: "hedge insertion",

  detect(source: string, rendered: string, ctx: RuleContext): Hit[] {
    const hedges = [
      ...ctx.dictionaries.hedges.ja,
      ...ctx.dictionaries.hedges.en,
    ];

    const hits: Hit[] = [];
    for (const h of hedges) {
      if (!h) continue;
      const reSource = new RegExp(escape(h), "i");
      if (reSource.test(source)) continue; // already in source — fine

      const where = findInRendered(rendered, h);
      if (!where) continue;

      hits.push({
        rule: "P4",
        ruleName: "hedge insertion",
        severity: "warn",
        message:
          `Rendered text adds a hedge that was not in the source: ` +
          JSON.stringify(h),
        renderedSpan: {
          start: where.start,
          end: where.end,
          text: rendered.slice(where.start, where.end),
        },
        suggestion:
          "Either remove the hedge or, if the original claim really is " +
          "uncertain, mark the task as 'paraphrase'.",
      });
    }

    return hits;
  },
};
