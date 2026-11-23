export type LetterKind = 'vowel' | 'consonant';

const vowels = 'AAAAAAAEEEEEEEEIIIIIOOOOOUUU';
const consonants = 'BBCCDDFFGGHHJJKKLLMMNNPPQRRRSSSSTTTVVWWXXYYZZ';

/**
 * The letter distribution is provisional until the game's exact
 * historical rules and approved French lexicon are documented.
 */
export function isLetterChoices(value: unknown): value is LetterKind[] {
  return Array.isArray(value) && value.length === 10 &&
    value.every(kind => kind === 'vowel' || kind === 'consonant');
}

export function drawLetters(
  choices: readonly LetterKind[],
  random: () => number = Math.random
): string[] {
  return choices.map(kind => {
    const pool = kind === 'vowel' ? vowels : consonants;
    return pool[Math.floor(random() * pool.length)];
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
