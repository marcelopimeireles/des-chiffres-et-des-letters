import { randomUUID } from 'node:crypto';
import { canMakeWordFromTiles, normalizeCandidate, shuffle, tileLetters, WordLanguage } from './letters';
import { getLexicon, lookupDictionaryWord } from '../services/dictionary';

export type DuelKind = 'anagram' | 'mental';
export const DUEL_SECONDS = 30;
export const DUEL_SCORE = 8;

export interface DuelRound {
  drawId: string;
  kind: DuelKind;
  language: WordLanguage;
  createdAt: number;
  deadlineAt: number;
  challenge: string;
  letters?: string[];
  operands?: [number, number];
  operator?: '+' | '-' | '*';
  expected: string;
  answer?: string;
  score: number;
}

export type DuelAttempt = { valid: boolean; reason: 'accepted' | 'wrong_answer' | 'invalid_format'; score: number };

export class DuelRoundStore {
  private rounds = new Map<string, DuelRound>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random,
    private readonly ttlMs = 5 * 60 * 1000
  ) {}

  create(kind: DuelKind, language: WordLanguage): DuelRound {
    this.prune();
    if (this.rounds.size >= 500) {
      const oldest = this.rounds.keys().next().value;
      if (oldest) this.rounds.delete(oldest);
    }
    const createdAt = this.now();
    const common = {
      drawId: randomUUID(), kind, language, createdAt,
      deadlineAt: createdAt + DUEL_SECONDS * 1000, score: 0
    };
    let round: DuelRound;
    if (kind === 'anagram') {
      const candidates = getLexicon(language).words.filter(word =>
        tileLetters(word).length >= 6 && tileLetters(word).length <= 8 &&
        word.length === tileLetters(word).length
      );
      if (!candidates.length) throw new Error('Anagram lexicon is empty.');
      const word = candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
      const letters = shuffle(tileLetters(word), this.random);
      round = {
        ...common, expected: word, letters, challenge: letters.join(' ')
      };
    } else {
      const a = 12 + Math.floor(this.random() * 35);
      const b = 2 + Math.floor(this.random() * 13);
      const operators: Array<'+' | '-' | '*'> = ['+', '-', '*'];
      const op = operators[Math.floor(this.random() * operators.length)];
      const left = op === '-' ? Math.max(a, b) : a;
      const right = op === '-' ? Math.min(a, b) : b;
      const result = op === '+' ? left + right : op === '-' ? left - right : left * right;
      round = {
        ...common, operands: [left, right], operator: op,
        expected: String(result), challenge: `${left} ${op} ${right} = ?`
      };
    }
    this.rounds.set(round.drawId, round);
    return round;
  }

  get(id: string): DuelRound | undefined {
    const round = this.rounds.get(id);
    if (round && this.now() - round.createdAt > this.ttlMs) {
      this.rounds.delete(id);
      return undefined;
    }
    return round;
  }

  isFinished(round: DuelRound): boolean {
    return round.answer !== undefined || this.now() >= round.deadlineAt;
  }

  submit(round: DuelRound, input: unknown): DuelAttempt {
    if (this.isFinished(round)) throw new Error('duel_finished');
    if (typeof input !== 'string' || input.length > 40) {
      return { valid: false, reason: 'invalid_format', score: 0 };
    }
    if (round.kind === 'anagram') {
      const word = normalizeCandidate(input);
      if (!word || tileLetters(word).length !== round.letters?.length) {
        return { valid: false, reason: 'invalid_format', score: 0 };
      }
      if (!canMakeWordFromTiles(word, round.letters || []) ||
          !lookupDictionaryWord(round.language, word)) {
        return { valid: false, reason: 'wrong_answer', score: 0 };
      }
      round.answer = word;
    } else {
      const cleaned = input.trim();
      if (!/^\d{1,10}$/.test(cleaned)) {
        return { valid: false, reason: 'invalid_format', score: 0 };
      }
      if (String(Number(cleaned)) !== round.expected) {
        return { valid: false, reason: 'wrong_answer', score: 0 };
      }
      round.answer = cleaned;
    }
    round.score = DUEL_SCORE;
    return { valid: true, reason: 'accepted', score: DUEL_SCORE };
  }

  reveal(round: DuelRound): { answer: string; score: number } | null {
    return this.isFinished(round) ? { answer: round.expected, score: round.score } : null;
  }

  /** Includes expected secret answers; keep on the server only. */
  exportState(): DuelRound[] {
    return [...this.rounds.values()];
  }

  restoreState(rows: DuelRound[]): void {
    this.rounds = new Map(
      rows.filter(row => this.now() - row.createdAt <= this.ttlMs)
        .map(row => [row.drawId, row])
    );
  }

  private prune(): void {
    for (const [id, round] of this.rounds) {
      if (this.now() - round.createdAt > this.ttlMs) this.rounds.delete(id);
    }
  }
}

export const duelRoundStore = new DuelRoundStore();
