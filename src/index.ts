/**
 * Programmatic API for faithful-echo.
 *
 * License: Apache-2.0
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
