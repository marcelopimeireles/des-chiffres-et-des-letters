/**
 * Evaluate only arithmetic using the tiles supplied by the game.
 * Never execute player input as JavaScript.
 */
export function evaluateNumbersExpression(expression: string, available: number[]): number {
  const compact = expression.replace(/\s+/g, '');
  const tokens = compact.match(/\d+|[()+*/-]/g) || [];
  if (!tokens.length || tokens.join('') !== compact) {
    throw new Error('Expression invalide. Utilisez uniquement +, −, ×, ÷ et des parenthèses.');
  }

  const counts = new Map<number, number>();
  available.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));

  let position = 0;
  const primary = (): number => {
    const token = tokens[position++];
    if (token === '(') {
      const result = sum();
      if (tokens[position++] !== ')') throw new Error('Parenthèses non équilibrées.');
      return result;
    }
    if (!token || !/^\d+$/.test(token)) {
      throw new Error('Nombre attendu.');
    }
    const value = Number(token);
    const remaining = counts.get(value) || 0;
    if (remaining < 1) throw new Error(`Le nombre ${value} n’est pas disponible.`);
    counts.set(value, remaining - 1);
    return value;
  };

  const product = (): number => {
    let value = primary();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position++];
      const right = primary();
      if (operator === '/' && right === 0) throw new Error('Division par zéro.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };

  const sum = (): number => {
    let value = product();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const operator = tokens[position++];
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = sum();
  if (position !== tokens.length || !Number.isFinite(result)) {
    throw new Error('Expression incomplète.');
  }
  return result;
}

export function canMakeWord(word: string, letters: string[]): boolean {
  const counts = new Map<string, number>();
  // Accented French/Portuguese characters use the equivalent unaccented tiles.
  const normalize = (input: string): string => input.toUpperCase()
    .replace(/Œ/g, 'OE').replace(/Æ/g, 'AE')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  letters.forEach(letter => {
    const character = normalize(letter);
    counts.set(character, (counts.get(character) || 0) + 1);
  });
  const normalized = normalize(word.trim());
  if (!/^[A-Z]+$/.test(normalized)) return false;
  return normalized.split('').every(character => {
    const remaining = counts.get(character) || 0;
    if (!remaining) return false;
    counts.set(character, remaining - 1);
    return true;
  });
}
