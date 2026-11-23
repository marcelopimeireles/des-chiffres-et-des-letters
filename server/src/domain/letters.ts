export type LetterKind = 'vowel' | 'consonant';
export type WordLanguage = 'en' | 'pt' | 'fr';

export const LANGUAGE_NAMES: Record<WordLanguage, string> = {
  en: 'English',
  pt: 'Português (Portugal)',
  fr: 'Français'
};

export function isWordLanguage(value: unknown): value is WordLanguage {
  return value === 'en' || value === 'pt' || value === 'fr';
}

// Provisional frequency pools; these are not official TV show distributions.
const POOLS: Record<WordLanguage, { vowel: string; consonant: string }> = {
  en: {
    vowel: 'AAAAAAAAEEEEEEEEEEEEIIIIIIIIIOOOOOOOOUUU',
    consonant: 'BBCCCDDDDFFGGGHHHHJJKKLLLLMMNNNNNNPPQRRRRRRSSSSTTTTTTVVWWXYYZ'
  },
  pt: {
    vowel: 'AAAAAAAAAAAAEEEEEEEEEEEIIIIIIOOOOOOOOOOUUUUU',
    consonant: 'BBCCCDDDDFFGGHHJLLLMMMNNNNPPQRRRRRRSSSSSSTTTTTTVXZ'
  },
  fr: {
    vowel: 'AAAAAAAEEEEEEEEIIIIIOOOOOUUU',
    consonant: 'BBCCDDFFGGHHJJKKLLMMNNPPQRRRSSSSTTTVVWWXXYYZZ'
  }
};

export function isLetterChoices(value: unknown): value is LetterKind[] {
  return Array.isArray(value) && value.length === 10 &&
    value.every(kind => kind === 'vowel' || kind === 'consonant');
}

export function drawLetters(
  choices: readonly LetterKind[],
  random: () => number = Math.random,
  language: WordLanguage = 'fr'
): string[] {
  return choices.map(kind => {
    const pool = POOLS[language][kind];
    const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
    return pool[index];
  });
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Accept only single, unhyphenated Latin-script words (including accents). */
export function normalizeCandidate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const word = value.trim().normalize('NFC').toLowerCase();
  if (!word || Array.from(word).length > 10 || !/^\p{Script=Latin}+$/u.test(word)) return null;
  return word;
}

/** The game uses unaccented tiles; é uses E, ç uses C and œ uses O+E. */
export function tileLetters(value: string): string[] {
  const expanded = value.toLocaleUpperCase().replace(/Œ/g, 'OE').replace(/Æ/g, 'AE');
  return Array.from(expanded.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

export function canMakeWordFromTiles(word: string, tiles: readonly string[]): boolean {
  const counts = new Map<string, number>();
  for (const character of tiles.flatMap(tileLetters)) {
    counts.set(character, (counts.get(character) || 0) + 1);
  }
  return tileLetters(word).every(character => {
    const count = counts.get(character) || 0;
    if (count === 0) return false;
    counts.set(character, count - 1);
    return true;
  });
}
