import { WordLanguage } from '../domain/letters';

/**
 * Remote dictionary implementation for the first multilingual MVP.
 * The public API supports en, fr, pt-BR (Portuguese currently uses BR).
 * https://dictionaryapi.dev/
 *
 * Fail closed: 404 means not found; network errors and rate limits mean
 * unavailable, NOT "invalid word". No external API keys are needed.
 */
const API_LOCALES: Record<WordLanguage, string> = {
  en: 'en',
  fr: 'fr',
  pt: 'pt-BR'
};

export class DictionaryUnavailableError extends Error {
  constructor() { super('Dictionary service unavailable'); }
}

export async function lookupDictionaryWord(
  language: WordLanguage,
  word: string,
  request: typeof fetch = fetch
): Promise<boolean> {
  const locale = API_LOCALES[language];
  const url = `https://api.dictionaryapi.dev/api/v2/entries/${locale}/${encodeURIComponent(word)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await request(url, { signal: controller.signal });
    if (response.status === 404) return false;
    if (!response.ok) throw new DictionaryUnavailableError();
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new DictionaryUnavailableError();
    return payload.some(entry =>
      entry && typeof entry === 'object' && typeof entry.word === 'string' &&
      entry.word.normalize('NFC').toLowerCase() === word.normalize('NFC').toLowerCase()
    );
  } catch {
    throw new DictionaryUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}
