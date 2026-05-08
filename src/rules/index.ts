/**
 * Registry and public entry point of the rule layer.
 *
 * Calling {@link audit} runs every rule against the (source, rendered)
 * pair and aggregates the hits into a {@link Report}.  Each rule is a
 * pure function; the order rules run in is irrelevant to the result.
 *
 * License: Apache-2.0
 */

import type {
  Hit,
  Report,
  Rule,
  RuleContext,
  RuleId,
} from "../types.js";

import { p1EntityDrift } from "./p1_entity_drift.js";
import { p2NumericDrift } from "./p2_numeric_drift.js";
import { p3QuantifierDrop } from "./p3_quantifier_drop.js";
import { p4HedgeInsertion } from "./p4_hedge_insertion.js";
import { p5Abstraction } from "./p5_abstraction.js";
import { p6SubjectSwap } from "./p6_subject_swap.js";
import { p7ToneSmoothing } from "./p7_tone_smoothing.js";

export const RULES: Rule[] = [
  p1EntityDrift,
  p2NumericDrift,
  p3QuantifierDrop,
  p4HedgeInsertion,
  p5Abstraction,
  p6SubjectSwap,
  p7ToneSmoothing,
];

export function audit(
  source: string,
  rendered: string,
  ctx: RuleContext,
): Report {
  const hits: Hit[] = [];
  for (const rule of RULES) {
    try {
      hits.push(...rule.detect(source, rendered, ctx));
    } catch (err) {
      // A buggy rule must never crash the run.  Emit an info-level hit so
      // the failure is visible to the caller.
      hits.push({
        rule: rule.id,
        ruleName: rule.name,
        severity: "info",
        message: `internal rule error: ${(err as Error).message ?? String(err)}`,
      });
    }
  }

  const byRule: Record<RuleId, number> = {
    P1: 0,
    P2: 0,
    P3: 0,
    P4: 0,
    P5: 0,
    P6: 0,
    P7: 0,
  };
  for (const h of hits) byRule[h.rule] += 1;

  return {
    task: ctx.task,
    hits,
    byRule,
    sourceLength: source.length,
    renderedLength: rendered.length,
  };
}

export {
  p1EntityDrift,
  p2NumericDrift,
  p3QuantifierDrop,
  p4HedgeInsertion,
  p5Abstraction,
  p6SubjectSwap,
  p7ToneSmoothing,
};
