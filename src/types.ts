/**
 * Public types for the faithful-echo rule layer.
 *
 * The rule layer is deterministic and side-effect free.  Each rule receives
 * the user's original text (the "source") and the LLM's rendered version
 * ("rendered"), plus a small {@link RuleContext} with shared resources, and
 * returns a flat list of {@link Hit} objects describing every place where
 * the rendered version may have drifted from the source.
 *
 * The types are intentionally small.  The whole point of the project is that
 * a hit can be evaluated by a human (or an LLM judge) without the tool
 * having to make a value judgement on its own.
 *
 * License: Apache-2.0
 */

export type TaskKind =
  | "verbatim_quote" // user wants every NG pattern checked strictly
  | "paraphrase" // moderate softening allowed
  | "summarize" // P3 (quantifier drop) and P5 (abstraction) muted
  | "translate"; // P5/P6 muted, only proper nouns / numbers checked

export type Severity = "info" | "warn" | "error";

export interface Span {
  /** 0-based character offset of the start of this span. */
  start: number;
  /** 0-based character offset just past the end. */
  end: number;
  /** The text within the span (already substring()ed). */
  text: string;
}

export interface Hit {
  /** Stable identifier of the rule that produced this hit (e.g. "P1"). */
  rule: RuleId;
  /** Short human-readable name for the rule. */
  ruleName: string;
  /** Default severity; the caller may upgrade or downgrade. */
  severity: Severity;
  /** A one-sentence explanation of why this hit was produced. */
  message: string;
  /** Where in the source the relevant text lives, if applicable. */
  sourceSpan?: Span;
  /** Where in the rendered output the change appears, if applicable. */
  renderedSpan?: Span;
  /** Optional second-person suggestion of how to fix it. */
  suggestion?: string;
}

export type RuleId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";

export interface RuleContext {
  task: TaskKind;
  /** ISO 639-1 code, "auto" lets each rule decide. */
  lang: "auto" | "ja" | "en";
  dictionaries: Dictionaries;
}

export interface Dictionaries {
  /** Words that *intensify* a statement (e.g. "extremely", "絶対"). */
  quantifiers: { ja: string[]; en: string[] };
  /** Words/suffixes that *soften* (e.g. "perhaps", "かもしれません"). */
  hedges: { ja: string[]; en: string[] };
  /**
   * Pairs of (specific_word, abstract_word).  If the rendered text replaces
   * `specific_word` with `abstract_word`, that's a P5 hit.
   */
  hypernymPairs: { specific: string; abstract: string }[];
}

export interface Rule {
  id: RuleId;
  name: string;
  /** Returns hits for this single rule.  Pure function. */
  detect(source: string, rendered: string, ctx: RuleContext): Hit[];
}

export interface Report {
  task: TaskKind;
  hits: Hit[];
  byRule: Record<RuleId, number>;
  /** Number of source characters; useful for context-window sanity checks. */
  sourceLength: number;
  /** Number of rendered characters. */
  renderedLength: number;
}
