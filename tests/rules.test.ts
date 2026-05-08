/**
 * Unit tests for each of the seven rules.  Fixtures are entirely
 * fictional (Alice / Bob / acme-corp / "fic_a" etc.) so the test
 * suite carries no user-specific information.
 *
 * License: Apache-2.0
 */

import { describe, expect, it } from "vitest";

import { audit, RULES } from "../src/rules/index.js";
import { loadDictionaries } from "../src/dictionaries.js";
import type { Hit, RuleContext, RuleId, TaskKind } from "../src/types.js";

const dicts = loadDictionaries();

function ctx(task: TaskKind = "verbatim_quote"): RuleContext {
  return { task, lang: "auto", dictionaries: dicts };
}

function hitsOf(rule: RuleId, hits: Hit[]): Hit[] {
  return hits.filter((h) => h.rule === rule);
}

// ---------- registry sanity ------------------------------------------------

describe("rule registry", () => {
  it("contains all seven rules in P1..P7 order", () => {
    expect(RULES.map((r) => r.id)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
    ]);
  });

  it("has a non-empty name for every rule", () => {
    for (const r of RULES) expect(r.name.length).toBeGreaterThan(0);
  });
});

// ---------- P1 entity drift ------------------------------------------------

describe("P1 entity drift", () => {
  it("flags a proper noun that disappears", () => {
    const r = audit(
      "Alice met Bob at acme-corp.",
      "She met someone at a company.",
      ctx(),
    );
    const text = hitsOf("P1", r.hits)
      .map((h) => h.message)
      .join("\n");
    expect(text).toContain("Alice");
    expect(text).toContain("Bob");
  });

  it("does not flag sentence-initial pronouns", () => {
    const r = audit("We will ship.", "the team will ship.", ctx());
    expect(hitsOf("P1", r.hits)).toHaveLength(0);
  });

  it("is case-insensitive across source/rendered", () => {
    const r = audit("Database is critical.", "the database is critical.", ctx());
    expect(hitsOf("P1", r.hits)).toHaveLength(0);
  });

  it("flags katakana proper nouns", () => {
    // The tokenizer segments by character class, so "カタカナ語" becomes a
    // katakana token "カタカナ" plus a kanji token "語"; the rule sees the
    // katakana run as the proper noun candidate.  This is by design — we
    // do not do morphological analysis here.
    const r = audit("カタカナのテスト。", "別の言葉のテスト。", ctx());
    const txt = hitsOf("P1", r.hits).map((h) => h.message).join("\n");
    expect(txt).toContain("カタカナ");
  });
});

// ---------- P2 numeric drift -----------------------------------------------

describe("P2 numeric drift", () => {
  it("flags a number that disappears", () => {
    const r = audit("The build takes 73.4 seconds.", "It is fast.", ctx());
    const h = hitsOf("P2", r.hits);
    expect(h).toHaveLength(1);
    expect(h[0]!.severity).toBe("error");
  });

  it("flags rounded numbers", () => {
    const r = audit("73.4%", "about 70%", ctx());
    expect(hitsOf("P2", r.hits)).toHaveLength(1);
  });

  it("treats 1,000 and 1000 as equal", () => {
    const r = audit("1,000 users", "1000 users", ctx());
    expect(hitsOf("P2", r.hits)).toHaveLength(0);
  });

  it("does not fire when the same number appears with the same unit", () => {
    const r = audit("Took 5 minutes.", "It took 5 minutes.", ctx());
    expect(hitsOf("P2", r.hits)).toHaveLength(0);
  });
});

// ---------- P3 quantifier drop ---------------------------------------------

describe("P3 quantifier drop", () => {
  it("flags a dropped intensifier", () => {
    const r = audit("This is absolutely required.", "This is required.", ctx());
    expect(hitsOf("P3", r.hits).length).toBeGreaterThan(0);
  });

  it("flags a dropped Japanese intensifier", () => {
    const r = audit("これは絶対に必須です。", "これは必須です。", ctx());
    const ids = hitsOf("P3", r.hits).map((h) => h.message);
    expect(ids.join("\n")).toContain("絶対");
  });

  it("is muted when task=summarize", () => {
    const r = audit(
      "This is absolutely required.",
      "This is required.",
      ctx("summarize"),
    );
    expect(hitsOf("P3", r.hits)).toHaveLength(0);
  });
});

// ---------- P4 hedge insertion ---------------------------------------------

describe("P4 hedge insertion", () => {
  it("flags a hedge added by the LLM", () => {
    const r = audit(
      "This is required.",
      "This might possibly be required.",
      ctx(),
    );
    const ids = hitsOf("P4", r.hits).map((h) => h.message);
    expect(ids.join("\n")).toContain("possibly");
  });

  it("does not fire when the source already hedges", () => {
    const r = audit("This might be required.", "This might be required.", ctx());
    expect(hitsOf("P4", r.hits)).toHaveLength(0);
  });

  it("flags a hedge in Japanese", () => {
    const r = audit("これは必須です。", "これはおそらく必須でしょう。", ctx());
    const ids = hitsOf("P4", r.hits).map((h) => h.message);
    expect(ids.join("\n")).toMatch(/おそらく/);
  });
});

// ---------- P5 abstraction -------------------------------------------------

describe("P5 abstraction", () => {
  it("flags Python → programming language", () => {
    const r = audit(
      "We picked Python for the rewrite.",
      "We picked a programming language for the rewrite.",
      ctx(),
    );
    expect(hitsOf("P5", r.hits).length).toBeGreaterThan(0);
  });

  it("flags Postgres → database", () => {
    const r = audit("Use Postgres.", "Use a database.", ctx());
    expect(hitsOf("P5", r.hits).length).toBeGreaterThan(0);
  });

  it("is muted when task=summarize", () => {
    const r = audit("Use Postgres.", "Use a database.", ctx("summarize"));
    expect(hitsOf("P5", r.hits)).toHaveLength(0);
  });

  it("does not fire when both terms are still present", () => {
    const r = audit(
      "We use Postgres because the database is fast.",
      "Yes — Postgres is the database.",
      ctx(),
    );
    expect(hitsOf("P5", r.hits)).toHaveLength(0);
  });
});

// ---------- P6 subject swap ------------------------------------------------

describe("P6 subject swap", () => {
  it("flags first-person → 'the user'", () => {
    const r = audit(
      "I deployed it last night.",
      "The user deployed it last night.",
      ctx(),
    );
    expect(hitsOf("P6", r.hits).length).toBeGreaterThan(0);
  });

  it("flags first-person Japanese → reattribution", () => {
    const r = audit("私が書きました。", "ユーザーが書きました。", ctx());
    expect(hitsOf("P6", r.hits).length).toBeGreaterThan(0);
  });

  it("is muted when task=translate", () => {
    const r = audit(
      "I deployed it last night.",
      "The user deployed it last night.",
      ctx("translate"),
    );
    expect(hitsOf("P6", r.hits)).toHaveLength(0);
  });
});

// ---------- P7 tone smoothing ----------------------------------------------

describe("P7 tone smoothing", () => {
  it("flags must → should consider", () => {
    const r = audit("You must read the README.", "You should consider reading the README.", ctx());
    expect(hitsOf("P7", r.hits).length).toBeGreaterThan(0);
  });

  it("flags 禁止 → 推奨", () => {
    const r = audit("X してはならない。", "X しないことが推奨されます。", ctx());
    expect(hitsOf("P7", r.hits).length).toBeGreaterThan(0);
  });

  it("notes when exclamation marks disappear", () => {
    const r = audit("Stop! Now!", "Please stop now.", ctx());
    const exHits = hitsOf("P7", r.hits).filter((h) =>
      h.message.includes("exclamation"),
    );
    expect(exHits.length).toBeGreaterThan(0);
  });
});

// ---------- aggregation ----------------------------------------------------

describe("audit() report shape", () => {
  it("counts hits per rule", () => {
    const r = audit(
      "We absolutely must use Python 3.11.",
      "It might be a programming language.",
      ctx(),
    );
    const total = Object.values(r.byRule).reduce((a, b) => a + b, 0);
    expect(total).toBe(r.hits.length);
  });

  it("populates lengths", () => {
    const r = audit("hello", "hello world", ctx());
    expect(r.sourceLength).toBe(5);
    expect(r.renderedLength).toBe(11);
  });

  it("never throws on empty inputs", () => {
    const r = audit("", "", ctx());
    expect(r.hits).toHaveLength(0);
  });
});
