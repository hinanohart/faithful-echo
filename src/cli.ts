#!/usr/bin/env node
/**
 * Command-line entry point.
 *
 *   faithful-echo check --source <file> --rendered <file> \
 *                       [--task verbatim_quote|paraphrase|summarize|translate] \
 *                       [--lang auto|ja|en] \
 *                       [--format json|pretty] \
 *                       [--dictionaries <dir>]
 *
 * Exit codes:
 *   0  no hits, or only `info` hits
 *   1  at least one `warn` hit
 *   2  at least one `error` hit (e.g. numeric drift)
 *
 * License: Apache-2.0
 */

import { readFileSync } from "node:fs";
import { exit } from "node:process";

import { Command } from "commander";

import { audit } from "./rules/index.js";
import { loadDictionaries, DEFAULT_DICT_DIR } from "./dictionaries.js";
import type { Report, RuleContext, TaskKind } from "./types.js";

const VERSION = "0.1.0";

interface CheckOptions {
  source: string;
  rendered: string;
  task: TaskKind;
  lang: "auto" | "ja" | "en";
  format: "json" | "pretty";
  dictionaries: string;
}

function readText(path: string): string {
  if (path === "-") return readFileSync(0, "utf8");
  return readFileSync(path, "utf8");
}

function exitCodeFor(report: Report): number {
  let hasWarn = false;
  for (const h of report.hits) {
    if (h.severity === "error") return 2;
    if (h.severity === "warn") hasWarn = true;
  }
  return hasWarn ? 1 : 0;
}

function formatPretty(report: Report): string {
  const lines: string[] = [];
  lines.push(
    `faithful-echo ${VERSION}  task=${report.task}  ` +
      `source=${report.sourceLength}c  rendered=${report.renderedLength}c`,
  );
  if (report.hits.length === 0) {
    lines.push("  no hits");
    return lines.join("\n");
  }
  for (const h of report.hits) {
    lines.push(
      `  [${h.severity.toUpperCase()}] ${h.rule} ${h.ruleName}: ${h.message}`,
    );
    if (h.suggestion) lines.push(`        → ${h.suggestion}`);
  }
  lines.push("");
  lines.push("  by rule:");
  for (const [id, n] of Object.entries(report.byRule)) {
    if (n > 0) lines.push(`    ${id}: ${n}`);
  }
  return lines.join("\n");
}

async function runCheck(opts: CheckOptions): Promise<void> {
  const source = readText(opts.source);
  const rendered = readText(opts.rendered);

  const dictionaries = loadDictionaries(opts.dictionaries);
  const ctx: RuleContext = {
    task: opts.task,
    lang: opts.lang,
    dictionaries,
  };

  const report = audit(source, rendered, ctx);

  if (opts.format === "json") {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(formatPretty(report) + "\n");
  }

  exit(exitCodeFor(report));
}

function main(): void {
  const program = new Command();
  program
    .name("faithful-echo")
    .description(
      "Detect where the LLM softened, paraphrased, hedged, or rounded " +
        "the user's original wording.",
    )
    .version(VERSION);

  program
    .command("check")
    .description("Compare a source file to a rendered file.")
    .requiredOption("-s, --source <path>", "user's original text (or '-' for stdin)")
    .requiredOption(
      "-r, --rendered <path>",
      "LLM's rendered version (or '-' for stdin)",
    )
    .option<TaskKind>(
      "-t, --task <kind>",
      "verbatim_quote | paraphrase | summarize | translate",
      ((v: string) => {
        const allowed: TaskKind[] = [
          "verbatim_quote",
          "paraphrase",
          "summarize",
          "translate",
        ];
        if (!allowed.includes(v as TaskKind)) {
          throw new Error(`task must be one of: ${allowed.join(", ")}`);
        }
        return v as TaskKind;
      }) as (v: string) => TaskKind,
      "verbatim_quote" as TaskKind,
    )
    .option<"auto" | "ja" | "en">(
      "-l, --lang <code>",
      "auto | ja | en",
      ((v: string) => {
        if (!["auto", "ja", "en"].includes(v)) {
          throw new Error("lang must be one of: auto, ja, en");
        }
        return v as "auto" | "ja" | "en";
      }) as (v: string) => "auto" | "ja" | "en",
      "auto" as "auto",
    )
    .option<"json" | "pretty">(
      "-f, --format <fmt>",
      "json | pretty",
      ((v: string) => {
        if (!["json", "pretty"].includes(v)) {
          throw new Error("format must be one of: json, pretty");
        }
        return v as "json" | "pretty";
      }) as (v: string) => "json" | "pretty",
      "pretty" as "pretty",
    )
    .option(
      "-d, --dictionaries <dir>",
      "directory containing quantifiers.yaml / hedges.yaml / hypernyms.yaml",
      DEFAULT_DICT_DIR,
    )
    .action(async (opts: CheckOptions) => {
      await runCheck(opts);
    });

  program.parseAsync().catch((err: unknown) => {
    process.stderr.write(`faithful-echo: ${(err as Error).message ?? err}\n`);
    exit(64);
  });
}

main();
