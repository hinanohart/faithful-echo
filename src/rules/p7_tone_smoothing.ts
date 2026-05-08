/**
 * P7 — Tone smoothing.
 *
 * If the source uses categorical/imperative tone ("must", "禁止", "!") and
 * the rendered version softens it to suggestion/recommendation tone
 * ("should consider", "推奨", "."), that's a hit.
 *
 * This rule looks at sentence-final markers, deontic modals, and
 * exclamation/question count.  It is intentionally simple; cases it
 * misses are caught by the LLM-judge layer at a higher cost.
 *
 * License: Apache-2.0
 */

import type { Hit, Rule, RuleContext } from "../types.js";

const STRONG_MODALS_EN =
  /\b(must|shall|will|do not|don't|never|always|required|forbidden|prohibited)\b/i;
const SOFT_MODALS_EN =
  /\b(may|might|could|should consider|tend to|often|sometimes|recommend(?:ed)?|suggest(?:ed)?)\b/i;

const STRONG_JA = /(禁止|必須|必ず|絶対|してはならない|しなければならない|だ。|だ$)/;
const SOFT_JA = /(推奨|お勧め|おすすめ|望ましい|することができます|するとよいでしょう|かもしれません)/;

function exclamationCount(text: string): number {
  return (text.match(/[!！]/g) || []).length;
}

export const p7ToneSmoothing: Rule = {
  id: "P7",
  name: "tone smoothing",

  detect(source: string, rendered: string, _ctx: RuleContext): Hit[] {
    const hits: Hit[] = [];

    const srcStrongEn = STRONG_MODALS_EN.test(source);
    const rndStrongEn = STRONG_MODALS_EN.test(rendered);
    const rndSoftEn = SOFT_MODALS_EN.test(rendered);
    if (srcStrongEn && !rndStrongEn && rndSoftEn) {
      hits.push({
        rule: "P7",
        ruleName: "tone smoothing",
        severity: "warn",
        message:
          "Source uses categorical/deontic tone, rendered version downgrades " +
          "to suggestion/recommendation tone.",
        suggestion:
          "Restore the original modal verb. 'must' is not the same as " +
          "'should consider'.",
      });
    }

    const srcStrongJa = STRONG_JA.test(source);
    const rndStrongJa = STRONG_JA.test(rendered);
    const rndSoftJa = SOFT_JA.test(rendered);
    if (srcStrongJa && !rndStrongJa && rndSoftJa) {
      hits.push({
        rule: "P7",
        ruleName: "tone smoothing",
        severity: "warn",
        message:
          "ソースは断定/命令調ですが、レンダリングされた文は推奨/提案調に弱められています。",
        suggestion:
          "原文の語気 (禁止/必須/絶対 など) を保ってください。'推奨' は '禁止' と等価ではありません。",
      });
    }

    const srcEx = exclamationCount(source);
    const rndEx = exclamationCount(rendered);
    if (srcEx > 0 && rndEx === 0) {
      hits.push({
        rule: "P7",
        ruleName: "tone smoothing",
        severity: "info",
        message:
          `Source contains ${srcEx} exclamation mark(s); rendered version contains none.`,
        suggestion:
          "Exclamation marks carry emphasis; restore them unless the task " +
          "is 'summarize'.",
      });
    }

    return hits;
  },
};
