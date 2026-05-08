/**
 * P1 — Entity drift.
 *
 * If the source mentions a proper noun (capitalised English run, katakana
 * run, or 4+ kanji compound) and the rendered version replaces it with a
 * different proper noun (or drops it entirely), that's a hit.
 *
 * This rule is heuristic by design.  We do not run a real NER model; we
 * just compare the multiset of "proper-noun-shaped" tokens between source
 * and rendered.  False positives are reduced by:
 *   - ignoring case for English,
 *   - ignoring tokens that appear in BOTH source and rendered,
 *   - ignoring single-letter tokens.
 *
 * License: Apache-2.0
 */

import type { Hit, Rule, RuleContext } from "../types.js";
import { tokenize } from "../tokenize.js";

/**
 * Words that *start* English sentences and would otherwise look like
 * proper nouns to a leading-capital heuristic.  We drop these from the
 * candidate set to avoid noise.
 */
const SENTENCE_INITIAL_STOPWORDS = new Set([
  // Pronouns / determiners
  "I", "We", "They", "He", "She", "It", "You", "My", "Our", "Their",
  "The", "A", "An", "This", "That", "These", "Those", "Some", "Any",
  // Conjunctions / interjections
  "And", "Or", "But", "So", "Yet", "For", "Nor", "Also", "However",
  "Although", "Though", "Because", "Since", "While", "Whereas",
  // WH-words
  "When", "Where", "Why", "How", "What", "Who", "Which", "Whose",
  // Modal/aux at sentence start
  "If", "Then", "Else", "Now", "Here", "There", "Today", "Tomorrow",
  "Yesterday", "Once", "Always", "Never", "Often", "Sometimes",
  // Frequent common-noun starts (would be tested case-insensitively
  // anyway, but listed here for clarity)
  "Use", "Run", "Build", "Read", "Write", "Note", "See", "Try",
]);

function properNounCandidates(text: string): Set<string> {
  const out = new Set<string>();
  for (const tok of tokenize(text)) {
    if (tok.kind === "word") {
      // English proper nouns: a leading capital and length >= 2,
      // not a sentence-initial stopword.
      if (
        /^[A-Z][A-Za-z0-9_+\-]{1,}$/.test(tok.text) &&
        !SENTENCE_INITIAL_STOPWORDS.has(tok.text)
      ) {
        out.add(tok.text);
      }
    } else if (tok.kind === "katakana" && tok.text.length >= 2) {
      out.add(tok.text);
    } else if (tok.kind === "kanji" && tok.text.length >= 4) {
      // Four-or-more-kanji compounds are usually named entities or terms
      // of art.  Two/three-kanji compounds catch too many common nouns.
      out.add(tok.text);
    }
  }
  return out;
}

export const p1EntityDrift: Rule = {
  id: "P1",
  name: "entity drift",

  detect(source: string, rendered: string, _ctx: RuleContext): Hit[] {
    const src = properNounCandidates(source);
    const rnd = properNounCandidates(rendered);
    // Case-insensitive lookup so we don't fire when the only difference
    // is capitalisation (e.g. source "Database" vs rendered "database").
    const rndLower = new Set([...rnd].map((s) => s.toLowerCase()));

    const hits: Hit[] = [];

    for (const name of src) {
      if (rnd.has(name)) continue;
      if (rndLower.has(name.toLowerCase())) continue;
      // Also skip if it's a common-noun-shaped word that just happens to
      // pass the all-caps / capitalised-letter heuristic (e.g.
      // "Database" at the start of a sentence).
      if (
        /^[A-Z][a-z]+$/.test(name) &&
        rendered.toLowerCase().includes(name.toLowerCase())
      ) {
        continue;
      }

      // Find the offset in the source for the report.
      const idx = source.indexOf(name);
      const sourceSpan =
        idx >= 0
          ? { start: idx, end: idx + name.length, text: name }
          : undefined;

      hits.push({
        rule: "P1",
        ruleName: "entity drift",
        severity: "warn",
        message:
          "Proper noun present in source is missing from the rendered version: " +
          JSON.stringify(name),
        sourceSpan,
        suggestion:
          "If you summarised it on purpose, set task to 'summarize'; " +
          "otherwise restore the original term.",
      });
    }

    return hits;
  },
};
