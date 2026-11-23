/**
 * Provisional "Le compte est bon" rules:
 * +, -, *, / with positive integer intermediate values, exact division,
 * and each physical tile used at most once. Some or all six tiles may be used.
 * Scoring is provisional: 10 exact, 7 within 5, 5 within 10, otherwise 0.
 */
export type Operator = '+' | '-' | '*' | '/';

export interface CalculationStep {
  left: number;
  operator: Operator;
  right: number;
  result: number;
}

interface Leaf {
  value: number;
  tileIndex: number;
}
interface Operation {
  value: number;
  left: Tree;
  right: Tree;
  operator: Operator;
}
type Tree = Leaf | Operation;

export interface NumbersSolution {
  value: number;
  distance: number;
  exact: boolean;
  expression: string;
  steps: CalculationStep[];
  usedTiles: number[];
}

const MAX_INTERMEDIATE = 1000000000;

export function applyOperation(a: number, b: number, op: Operator): number {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a <= 0 || b <= 0) {
    throw new Error('Les opérations exigent des entiers strictement positifs.');
  }
  let result: number;
  switch (op) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/':
      if (a % b !== 0) throw new Error('La division doit être exacte.');
      result = a / b;
      break;
    default: throw new Error('Opération non autorisée.');
  }
  if (!Number.isSafeInteger(result) || result <= 0 || result > MAX_INTERMEDIATE) {
    throw new Error('Chaque résultat intermédiaire doit être entier et strictement positif.');
  }
  return result;
}

function normalizedExpression(expression: string): string {
  return expression.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
}

/** Parse and validate a complete user expression, never executing JS. */
export function parseNumbersExpression(expression: string, tiles: readonly number[]): number {
  if (typeof expression !== 'string' || expression.length > 180) {
    throw new Error('Expression trop longue ou invalide.');
  }
  const compact = normalizedExpression(expression);
  const tokens = compact.match(/\d+|[()+*/-]/g) || [];
  if (!tokens.length || tokens.join('') !== compact) {
    throw new Error('Utilisez uniquement les nombres, +, -, *, / et les parenthèses.');
  }
  const remaining = new Map<number, number>();
  for (const tile of tiles) remaining.set(tile, (remaining.get(tile) || 0) + 1);
  let position = 0;

  const atom = (): number => {
    const token = tokens[position++];
    if (token === '(') {
      const result = addSub();
      if (tokens[position++] !== ')') throw new Error('Parenthèses non équilibrées.');
      return result;
    }
    if (!token || !/^\d+$/.test(token)) throw new Error('Nombre attendu.');
    const value = Number(token);
    if (!Number.isSafeInteger(value) || (remaining.get(value) || 0) === 0) {
      throw new Error(`La plaque ${token} n’est pas disponible.`);
    }
    remaining.set(value, (remaining.get(value) || 0) - 1);
    return value;
  };
  const multiplyDivide = (): number => {
    let value = atom();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const op = tokens[position++] as Operator;
      value = applyOperation(value, atom(), op);
    }
    return value;
  };
  const addSub = (): number => {
    let value = multiplyDivide();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const op = tokens[position++] as Operator;
      value = applyOperation(value, multiplyDivide(), op);
    }
    return value;
  };
  const result = addSub();
  if (position !== tokens.length) throw new Error('Expression incomplète.');
  return result;
}

export function scoreNumbers(distance: number): number {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  if (distance === 0) return 10;
  if (distance <= 5) return 7;
  if (distance <= 10) return 5;
  return 0;
}

function countBits(mask: number): number {
  let count = 0;
  for (let n = mask; n > 0; n &= n - 1) count++;
  return count;
}

function expression(tree: Tree): string {
  return 'tileIndex' in tree
    ? String(tree.value)
    : `(${expression(tree.left)} ${tree.operator} ${expression(tree.right)})`;
}

function details(tree: Tree, steps: CalculationStep[], used: number[]): void {
  if ('tileIndex' in tree) {
    used.push(tree.tileIndex);
    return;
  }
  details(tree.left, steps, used);
  details(tree.right, steps, used);
  steps.push({
    left: tree.left.value, operator: tree.operator,
    right: tree.right.value, result: tree.value
  });
}

function buildSolution(tree: Tree, target: number): NumbersSolution {
  const steps: CalculationStep[] = [];
  const usedTiles: number[] = [];
  details(tree, steps, usedTiles);
  return {
    value: tree.value, distance: Math.abs(tree.value - target),
    exact: tree.value === target, expression: expression(tree),
    steps, usedTiles
  };
}

/**
 * Dynamic programming over every subset of the six physical tiles.
 * One expression is stored for each attainable integer per subset.
 * The search covers all parenthesizations and valid intermediate operations.
 */
export function solveNumbers(tiles: readonly number[], target: number): NumbersSolution {
  if (tiles.length !== 6 || tiles.some(value => !Number.isSafeInteger(value) || value <= 0) ||
      !Number.isSafeInteger(target) || target < 1) {
    throw new Error('Le solveur exige six plaques et une cible positive.');
  }
  const maxMask = 1 << tiles.length;
  const table = new Map<number, Map<number, Tree>>();
  let nearest: Tree | null = null;
  let nearestDistance = Infinity;
  let nearestUsed = Infinity;

  const consider = (tree: Tree, usedCount: number) => {
    const difference = Math.abs(tree.value - target);
    if (difference < nearestDistance ||
        (difference === nearestDistance && usedCount < nearestUsed)) {
      nearest = tree;
      nearestDistance = difference;
      nearestUsed = usedCount;
    }
  };

  for (let size = 1; size <= tiles.length; size++) {
    for (let mask = 1; mask < maxMask; mask++) {
      if (countBits(mask) !== size) continue;
      const reachable = new Map<number, Tree>();
      table.set(mask, reachable);
      if (size === 1) {
        const tileIndex = Math.log2(mask);
        const leaf: Leaf = { value: tiles[tileIndex], tileIndex };
        reachable.set(leaf.value, leaf);
        consider(leaf, size);
        if (nearestDistance === 0) return buildSolution(leaf, target);
        continue;
      }

      const leastBit = mask & -mask;
      for (let leftMask = (mask - 1) & mask; leftMask; leftMask = (leftMask - 1) & mask) {
        if ((leftMask & leastBit) === 0) continue; // unordered partitions only
        const rightMask = mask ^ leftMask;
        const leftMap = table.get(leftMask);
        const rightMap = table.get(rightMask);
        if (!leftMap || !rightMap) continue;

        const record = (value: number, first: Tree, second: Tree, operator: Operator) => {
          if (value <= 0 || value > MAX_INTERMEDIATE || !Number.isSafeInteger(value) ||
              reachable.has(value)) return;
          reachable.set(value, { value, left: first, right: second, operator });
        };

        for (const a of leftMap.values()) {
          for (const b of rightMap.values()) {
            record(a.value + b.value, a, b, '+');
            record(a.value * b.value, a, b, '*');
            record(a.value - b.value, a, b, '-');
            record(b.value - a.value, b, a, '-');
            if (a.value % b.value === 0) record(a.value / b.value, a, b, '/');
            if (b.value % a.value === 0) record(b.value / a.value, b, a, '/');
          }
        }
      }
      for (const possible of reachable.values()) {
        consider(possible, size);
        if (nearestDistance === 0) return buildSolution(possible, target);
      }
    }
  }

  if (!nearest) throw new Error('Aucune solution disponible.');
  return buildSolution(nearest, target);
}

export const LARGE_TILES = [25, 50, 75, 100] as const;
export const SMALL_TILES = Array.from({ length: 20 }, (_, i) => i % 10 + 1);

/** Select unique large plates, then small ones (each 1..10 appears twice). */
export function drawNumbers(
  largeCount: number, random: () => number = Math.random
): number[] {
  if (!Number.isInteger(largeCount) || largeCount < 0 || largeCount > 4) {
    throw new Error('Choisissez entre zéro et quatre grandes plaques.');
  }
  const choose = (values: readonly number[], count: number): number[] => {
    const pool = [...values];
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  };
  const chosen = [...choose(LARGE_TILES, largeCount), ...choose(SMALL_TILES, 6 - largeCount)];
  return choose(chosen, chosen.length);
}
