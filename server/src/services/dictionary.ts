import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  canMakeWordFromTiles, normalizeCandidate, tileLetters, WordLanguage
} from '../domain/letters';

export interface Lexicon {
  words: string[];
  exact: Set<string>;
  folded: Map<string, string>;
}

export interface WordSolutions {
  bestLength: number;
  bestWords: string[];
  lexiconEntries: number;
}

// This is a *game lexicon*, not a prescriptive or exhaustive language dictionary.
// Source lists and their separate licences are documented in data/LEXICON-SOURCES.md.
const cache = new Map<WordLanguage, Lexicon>();

export function foldWord(word: string): string {
  return tileLetters(word).join('').toLowerCase();
}

export function buildLexicon(entries: Iterable<string>): Lexicon {
  const words: string[] = [];
  const exact = new Set<string>();
  const folded = new Map<string, string>();
  for (const entry of entries) {
    const word = normalizeCandidate(entry);
    if (!word || exact.has(word)) continue;
    exact.add(word);
    words.push(word);
    const foldedWord = foldWord(word);
    if (!folded.has(foldedWord)) folded.set(foldedWord, word);
  }
  return { words, exact, folded };
}

/** Load a plain UTF-8 list stored with the server; no network access required. */
export function getLexicon(language: WordLanguage): Lexicon {
  let dictionary = cache.get(language);
  if (!dictionary) {
    const file = resolve(__dirname, '../../data/dictionaries', language + '.txt');
    const contents = readFileSync(file, 'utf8');
    dictionary = buildLexicon(contents.split(/\r?\n/));
    if (dictionary.words.length === 0) throw new Error('Empty local lexicon for ' + language);
    cache.set(language, dictionary);
  }
  return dictionary;
}

/** Lookup accent-insensitively, returning the spelling represented in the word list. */
export function lookupDictionaryWord(language: WordLanguage, word: string): string | null {
  const dictionary = getLexicon(language);
  const normalized = normalizeCandidate(word);
  if (!normalized) return null;
  if (dictionary.exact.has(normalized)) return normalized;
  return dictionary.folded.get(foldWord(normalized)) || null;
}

export function findBestWords(
  dictionary: Lexicon, tiles: readonly string[], language: WordLanguage, limit = 8
): WordSolutions {
  const safeLimit = Math.max(1, Math.min(12, Math.floor(limit)));
  let bestLength = 0;
  const bestWords: string[] = [];
  for (const word of dictionary.words) {
    const length = tileLetters(word).length;
    if (length < 2 || length > tiles.length || length < bestLength) continue;
    if (!canMakeWordFromTiles(word, tiles)) continue;
    if (length > bestLength) {
      bestLength = length;
      bestWords.length = 0;
    }
    bestWords.push(word);
  }
  bestWords.sort((a, b) => a.localeCompare(b, language === 'pt' ? 'pt-PT' : language));
  return {
    bestLength,
    bestWords: bestWords.slice(0, safeLimit),
    lexiconEntries: dictionary.words.length
  };
}

export function solveLetters(language: WordLanguage, tiles: readonly string[]): WordSolutions {
  return findBestWords(getLexicon(language), tiles, language);
}
