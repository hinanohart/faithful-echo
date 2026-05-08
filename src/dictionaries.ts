/**
 * Load the bilingual rule dictionaries from YAML at module load time.
 *
 * The YAML files live in the project's `dictionaries/` directory and are
 * shipped as part of the npm package; they are not fetched from the
 * network at runtime.
 *
 * License: Apache-2.0
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import type { Dictionaries } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Default location of the bundled dictionaries directory. */
export const DEFAULT_DICT_DIR = join(HERE, "..", "dictionaries");

interface QuantifiersDoc {
  ja: string[];
  en: string[];
}

interface HedgesDoc {
  ja: string[];
  en: string[];
}

interface HypernymsDoc {
  pairs: { specific: string; abstract: string }[];
}

function readYaml<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  const doc = parseYaml(raw);
  return doc as T;
}

/**
 * Load all dictionaries from the given directory.  Pass a different
 * directory to override the bundled defaults entirely.
 */
export function loadDictionaries(dir: string = DEFAULT_DICT_DIR): Dictionaries {
  const quantifiers = readYaml<QuantifiersDoc>(join(dir, "quantifiers.yaml"));
  const hedges = readYaml<HedgesDoc>(join(dir, "hedges.yaml"));
  const hypernyms = readYaml<HypernymsDoc>(join(dir, "hypernyms.yaml"));
  return {
    quantifiers: {
      ja: quantifiers?.ja ?? [],
      en: quantifiers?.en ?? [],
    },
    hedges: {
      ja: hedges?.ja ?? [],
      en: hedges?.en ?? [],
    },
    hypernymPairs: hypernyms?.pairs ?? [],
  };
}
