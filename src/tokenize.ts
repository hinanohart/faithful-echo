/**
 * Lightweight bilingual tokenizer.
 *
 * The point of this module is *not* to be a serious NLP tokenizer; it is to
 * give every rule a single shared notion of "what a word is" so the rules
 * stay deterministic and easy to test.  We segment by character class
 * (Latin word, number, katakana run, kanji run, hiragana run) and discard
 * whitespace and punctuation.  No external NLP dependency.
 *
 * SPDX-License-Identifier: MIT
 */

export type TokenKind =
  | "word" // Latin word characters
  | "number" // Digits, optional decimal, optional %, KB/MB/GB suffix
  | "katakana" // Katakana run
  | "hiragana" // Hiragana run
  | "kanji" // CJK Unified Ideographs run
  | "other";

export interface Token {
  /** The exact substring of the original text. */
  text: string;
  /** Inclusive 0-based start offset within the original text. */
  start: number;
  /** Exclusive end offset. */
  end: number;
  kind: TokenKind;
}

/**
 * Tokenize a piece of text into a flat array of class-tagged tokens.  The
 * returned tokens never overlap.  Whitespace and punctuation produce no
 * tokens.
 */
export function tokenize(text: string): Token[] {
  // Order in this regex matters: the engine returns the first alternative
  // it can match at each position.  We put longer / more specific patterns
  // first.
  const re =
    /[A-Za-z][A-Za-z0-9_]*(?:[-+][A-Za-z0-9]+)*|-?[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?(?:%|[KMG]i?B|[mµu]?s|秒|分|時間)?|-?[0-9]+(?:\.[0-9]+)?(?:%|[KMG]i?B|[mµu]?s|秒|分|時間)?|[゠-ヿㇰ-ㇿ]+|[぀-ゟ]+|[㐀-鿿豈-﫿]+/gu;
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0];
    let kind: TokenKind = "other";
    const first = t.codePointAt(0)!;
    if (/^[A-Za-z]/.test(t)) kind = "word";
    else if (/^-?[0-9]/.test(t)) kind = "number";
    else if (first >= 0x30a0 && first <= 0x30ff) kind = "katakana";
    else if (first >= 0x3040 && first <= 0x309f) kind = "hiragana";
    else if (
      (first >= 0x3400 && first <= 0x9fff) ||
      (first >= 0xf900 && first <= 0xfaff)
    )
      kind = "kanji";
    out.push({ text: t, start: m.index, end: m.index + t.length, kind });
  }
  return out;
}

/** Quick test: does the text contain any CJK character? */
export function looksJapanese(text: string): boolean {
  return /[぀-ヿ㐀-鿿豈-﫿]/u.test(text);
}

/** Quick test: does the text contain any non-CJK Latin word? */
export function looksLatin(text: string): boolean {
  return /[A-Za-z]{2,}/.test(text);
}

/**
 * Pick a language for a piece of text.  "auto" defers to the rule.
 */
export function detectLang(text: string): "ja" | "en" | "mixed" {
  const ja = looksJapanese(text);
  const en = looksLatin(text);
  if (ja && en) return "mixed";
  if (ja) return "ja";
  return "en";
}
