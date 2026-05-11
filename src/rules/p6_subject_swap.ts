/**
 * P6 — Subject swap.
 *
 * If the source speaks in the first person ("I", "私", "we") and the
 * rendered version reattributes it to a different subject ("the user",
 * "users", "one"), or recasts an active assertion as a passive
 * description, that's a hit.
 *
 * This is the noisiest rule — language is rarely strict about subject —
 * so we set the default severity to "info" and rely on the LLM-judge
 * layer to decide whether it matters in context.
 *
 * SPDX-License-Identifier: MIT
 */

import type { Hit, Rule, RuleContext } from "../types.js";

const FIRST_PERSON_EN = /\b(I|me|my|mine|we|us|our|ours)\b/;
const REATTRIBUTION_EN =
  /\b(the user|users|one|people|developers?|readers?|the author)\b/i;

const FIRST_PERSON_JA = /(私|僕|俺|わたし|ぼく)/;
const REATTRIBUTION_JA =
  /(ユーザー|利用者|読者|開発者|筆者|彼ら|人々)/;

export const p6SubjectSwap: Rule = {
  id: "P6",
  name: "subject swap",

  detect(source: string, rendered: string, ctx: RuleContext): Hit[] {
    if (ctx.task === "translate") return [];

    const hits: Hit[] = [];

    const srcHasFirstEn = FIRST_PERSON_EN.test(source);
    const rndHasFirstEn = FIRST_PERSON_EN.test(rendered);
    const rndHasReattrEn = REATTRIBUTION_EN.test(rendered);

    if (srcHasFirstEn && !rndHasFirstEn && rndHasReattrEn) {
      hits.push({
        rule: "P6",
        ruleName: "subject swap",
        severity: "info",
        message:
          "Source uses first person, rendered version reattributes the " +
          "claim to 'the user' / 'users' / 'developers' / 'readers'.",
        suggestion:
          "Keep the first-person voice unless the task is explicitly a " +
          "summary or translation.",
      });
    }

    const srcHasFirstJa = FIRST_PERSON_JA.test(source);
    const rndHasFirstJa = FIRST_PERSON_JA.test(rendered);
    const rndHasReattrJa = REATTRIBUTION_JA.test(rendered);

    if (srcHasFirstJa && !rndHasFirstJa && rndHasReattrJa) {
      hits.push({
        rule: "P6",
        ruleName: "subject swap",
        severity: "info",
        message:
          "ソースは一人称ですが、レンダリングされた文は他者主語 (ユーザー/読者/開発者など) に置き換わっています。",
        suggestion:
          "task が 'translate' / 'summarize' でなければ一人称を保ってください。",
      });
    }

    return hits;
  },
};
