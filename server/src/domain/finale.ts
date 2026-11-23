import { randomUUID } from 'node:crypto';
import {
  canMakeWordFromTiles, normalizeCandidate, shuffle, tileLetters, WordLanguage
} from './letters';
import { getLexicon, lookupDictionaryWord } from '../services/dictionary';

export const FINALE_SECONDS = 120;
export const FINALE_ITEMS = 8;
export const FINALE_SCORE_PER_WORD = 10;

export interface FinaleItem {
  letters: string[];
  target: string;
  answer?: string | null;
  score?: number;
}
export interface FinaleRound {
  drawId: string;
  language: WordLanguage;
  createdAt: number;
  deadlineAt: number;
  currentIndex: number;
  score: number;
  items: FinaleItem[];
}

export type FinaleAttempt = {
  valid: boolean;
  reason: 'accepted' | 'invalid_format' | 'letters_mismatch' | 'not_in_dictionary';
  score: number; currentIndex: number; finished: boolean;
};

export class FinaleRoundStore {
  private rounds = new Map<string, FinaleRound>();
  constructor(
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random,
    private readonly ttlMs = 5 * 60 * 1000
  ) {}

  create(language: WordLanguage): FinaleRound {
    this.prune();
    if (this.rounds.size >= 300) {
      const oldest = this.rounds.keys().next().value;
      if (oldest) this.rounds.delete(oldest);
    }
    // Guarantee each of the eight anagrams has at least one local-lexicon solution.
    const candidates = getLexicon(language).words.filter(word => tileLetters(word).length === 10);
    if (candidates.length < FINALE_ITEMS) throw new Error('Not enough ten-tile words for finale.');
    const pool = shuffle(candidates, this.random);
    const items: FinaleItem[] = pool.slice(0, FINALE_ITEMS).map(word => ({
      target: word, letters: shuffle(tileLetters(word), this.random)
    }));
    const createdAt = this.now();
    const round = {
      drawId: randomUUID(), language, createdAt,
      deadlineAt: createdAt + FINALE_SECONDS * 1000,
      currentIndex: 0, score: 0, items
    };
    this.rounds.set(round.drawId, round);
    return round;
  }

  get(drawId: string): FinaleRound | undefined {
    const round = this.rounds.get(drawId);
    if (round && this.now() - round.createdAt > this.ttlMs) {
      this.rounds.delete(drawId);
      return undefined;
    }
    return round;
  }

  isFinished(round: FinaleRound): boolean {
    return round.currentIndex >= FINALE_ITEMS || this.now() >= round.deadlineAt;
  }

  submit(round: FinaleRound, index: number, input: unknown): FinaleAttempt {
    if (this.isFinished(round) || index !== round.currentIndex) {
      throw new Error('finale_inactive');
    }
    const item = round.items[index];
    const word = normalizeCandidate(input);
    const negative = (reason: FinaleAttempt['reason']): FinaleAttempt => ({
      valid: false, reason, score: round.score,
      currentIndex: round.currentIndex, finished: false
    });
    if (!word || tileLetters(word).length !== 10) return negative('invalid_format');
    if (!canMakeWordFromTiles(word, item.letters)) return negative('letters_mismatch');
    if (!lookupDictionaryWord(round.language, word)) return negative('not_in_dictionary');
    item.answer = word;
    item.score = FINALE_SCORE_PER_WORD;
    round.score += FINALE_SCORE_PER_WORD;
    round.currentIndex += 1;
    return {
      valid: true, reason: 'accepted', score: round.score,
      currentIndex: round.currentIndex, finished: this.isFinished(round)
    };
  }

  skip(round: FinaleRound, index: number): void {
    if (this.isFinished(round) || index !== round.currentIndex) throw new Error('finale_inactive');
    const item = round.items[index];
    item.answer = null;
    item.score = 0;
    round.currentIndex += 1;
  }

  current(round: FinaleRound): { index: number; letters: string[] } | null {
    if (this.isFinished(round)) return null;
    return {
      index: round.currentIndex,
      letters: [...round.items[round.currentIndex].letters]
    };
  }

  reveal(round: FinaleRound): { score: number; words: Array<{ target: string; answer: string | null; score: number }> } | null {
    if (!this.isFinished(round)) return null;
    return {
      score: round.score,
      words: round.items.map(item => ({
        target: item.target, answer: item.answer ?? null, score: item.score ?? 0
      }))
    };
  }

  /** Includes all eight hidden words; keep on the server only. */
  exportState(): FinaleRound[] {
    return [...this.rounds.values()];
  }

  restoreState(rows: FinaleRound[]): void {
    this.rounds = new Map(
      rows.filter(row => this.now() - row.createdAt <= this.ttlMs)
        .map(row => [row.drawId, row])
    );
  }

  private prune(): void {
    for (const [id, item] of this.rounds) {
      if (this.now() - item.createdAt > this.ttlMs) this.rounds.delete(id);
    }
  }
}

export const finaleRoundStore = new FinaleRoundStore();
