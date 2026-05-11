/**
 * Programmatic API for faithful-echo.
 *
 * SPDX-License-Identifier: MIT
 */

export { audit, RULES } from "./rules/index.js";
export { tokenize, detectLang } from "./tokenize.js";
export { loadDictionaries, DEFAULT_DICT_DIR } from "./dictionaries.js";
export type {
  Dictionaries,
  Hit,
  Report,
  Rule,
  RuleContext,
  RuleId,
  Severity,
  Span,
  TaskKind,
} from "./types.js";
