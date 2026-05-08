/**
 * P2 — Numeric drift.
 *
 * Every number that appears in the source must reappear *verbatim* (same
 * value, same unit) in the rendered version.  Substitutions like
 * "73.4%" → "about 70%" or "5 minutes" → "a few minutes" are flagged.
 *
 * To reduce noise we treat numbers that round-trip with the same value as
 * equivalent (so "1,000" and "1000" are the same), and we only fire when
 * a source number has *no* equal-valued counterpart in the rendered text.
 *
 * License: Apache-2.0
 */

import type { Hit, Rule, RuleContext } from "../types.js";
import { tokenize } from "../tokenize.js";

interface NumberOccurrence {
  text: string;
  value: number;
  unit: string;
  start: number;
}

const UNIT_RE = /(%|[KMG]i?B|m?s|秒|分|時間|usd|jpy|eur|gbp)$/i;

function parseNumberToken(text: string): { value: number; unit: string } | null {
  const cleaned = text.replace(/,/g, "");
  const unitMatch = cleaned.match(UNIT_RE);
  const unit = unitMatch ? unitMatch[0].toLowerCase() : "";
  const numericPart = unit ? cleaned.slice(0, -unit.length) : cleaned;
  const value = Number(numericPart);
  if (Number.isNaN(value)) return null;
  return { value, unit };
}

function extractNumbers(text: string): NumberOccurrence[] {
  const out: NumberOccurrence[] = [];
  for (const tok of tokenize(text)) {
    if (tok.kind !== "number") continue;
    const parsed = parseNumberToken(tok.text);
    if (!parsed) continue;
    out.push({
      text: tok.text,
      value: parsed.value,
      unit: parsed.unit,
      start: tok.start,
    });
  }
  return out;
}

function findCounterpart(
  needle: NumberOccurrence,
  haystack: NumberOccurrence[],
): NumberOccurrence | undefined {
  return haystack.find(
    (n) => n.value === needle.value && n.unit === needle.unit,
  );
}

export const p2NumericDrift: Rule = {
  id: "P2",
  name: "numeric drift",

  detect(source: string, rendered: string, _ctx: RuleContext): Hit[] {
    const srcNumbers = extractNumbers(source);
    const rndNumbers = extractNumbers(rendered);

    const hits: Hit[] = [];
    for (const n of srcNumbers) {
      const match = findCounterpart(n, rndNumbers);
      if (match) continue;
      hits.push({
        rule: "P2",
        ruleName: "numeric drift",
        severity: "error",
        message:
          `Number ${JSON.stringify(n.text)} from the source is missing or ` +
          `changed in the rendered version (no token with value ` +
          `${n.value}${n.unit ? " " + n.unit : ""} found).`,
        sourceSpan: {
          start: n.start,
          end: n.start + n.text.length,
          text: n.text,
        },
        suggestion:
          "Restore the exact value/unit. Numeric rounding is rarely a " +
          "stylistic choice — it usually changes meaning.",
      });
    }

    return hits;
  },
};
