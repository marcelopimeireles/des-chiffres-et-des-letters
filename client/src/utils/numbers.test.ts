import { canMakeWord, evaluateNumbersExpression } from './numbers';

describe('safe numbers expression evaluator', () => {
  const tiles = [10, 5, 8, 3, 2, 1];

  test('handles parentheses and precedence', () => {
    expect(evaluateNumbersExpression('(10 + 5) * 8 - 3', tiles)).toBe(117);
    expect(evaluateNumbersExpression('10 + 5 * 8', tiles)).toBe(50);
  });

  test('cannot reuse a tile', () => {
    expect(() => evaluateNumbersExpression('10 + 10', tiles)).toThrow();
  });

  test('rejects arbitrary code and invalid expressions', () => {
    expect(() => evaluateNumbersExpression('alert(1)', tiles)).toThrow();
    expect(() => evaluateNumbersExpression('10 / (5 - 5)', tiles)).toThrow();
    expect(() => evaluateNumbersExpression('10 +', tiles)).toThrow();
  });
});

describe('letter composition', () => {
  test('respects tile multiplicity', () => {
    expect(canMakeWord('RATE', ['R', 'A', 'T', 'E'])).toBe(true);
    expect(canMakeWord('RATTE', ['R', 'A', 'T', 'E'])).toBe(false);
  });

  test('does not accept arbitrary characters', () => {
    expect(canMakeWord('R2', ['R', 'A'])).toBe(false);
  });
});

test('Portuguese and French accents use their unaccented letter tiles', () => {
  expect(canMakeWord('ação', ['A','C','A','O'])).toBe(true);
  expect(canMakeWord('café', ['C','A','F','E'])).toBe(true);
  expect(canMakeWord('cœur', ['C','O','E','U','R'])).toBe(true);
  expect(canMakeWord('café!', ['C','A','F','E'])).toBe(false);
});
