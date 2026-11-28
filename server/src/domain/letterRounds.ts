import { randomUUID } from 'node:crypto';
import { drawLetters, LetterKind, WordLanguage } from './letters';

export const LETTER_REVEAL_MS = 230 * 10;
export const LETTER_PLAY_SECONDS = 30;

export interface LetterRound {
  drawId: string;
  letters: string[];
  choices: LetterKind[];
  language: WordLanguage;
  seed?: string;
  createdAt: number;
  deadlineAt: number;
  answer?: { word: string; score: number };
}

/**
 * MVP store: server holds the drawn tiles, language, answer, and deadline.
 * Sessions are memory-only, expire after 5 minutes, and are not shared between
 * server replicas. A persistent store is needed before scaling horizontally.
 */
export class LetterRoundStore {
  private rounds = new Map<string, LetterRound>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly ttlMs: number = 5 * 60 * 1000
  ) {}

  create(choices: LetterKind[], language: WordLanguage, random: () => number = Math.random, seed?: string): LetterRound {
    for (const [id, round] of this.rounds) {
      if (this.now() - round.createdAt > this.ttlMs) this.rounds.delete(id);
    }
    if (this.rounds.size >= 500) {
      const oldest = this.rounds.keys().next().value;
      if (oldest) this.rounds.delete(oldest);
    }
    const createdAt = this.now();
    const round: LetterRound = {
      drawId: randomUUID(), choices: [...choices], language, seed,
      letters: drawLetters(choices, random, language),
      createdAt,
      deadlineAt: createdAt + LETTER_REVEAL_MS + LETTER_PLAY_SECONDS * 1000
    };
    this.rounds.set(round.drawId, round);
    return round;
  }

  get(id: string): LetterRound | undefined {
    const round = this.rounds.get(id);
    if (!round) return undefined;
    if (this.now() - round.createdAt > this.ttlMs) {
      this.rounds.delete(id);
      return undefined;
    }
    return round;
  }

  isFinished(round: LetterRound): boolean {
    return Boolean(round.answer) || this.now() >= round.deadlineAt;
  }

  /** Privileged local snapshot, including secret tiles/answers (never send to browser). */
  exportState(): LetterRound[] {
    return [...this.rounds.values()];
  }

  restoreState(rows: LetterRound[]): void {
    this.rounds = new Map(
      rows.filter(row => this.now() - row.createdAt <= this.ttlMs)
        .map(row => [row.drawId, row])
    );
  }

  complete(round: LetterRound, word: string, score: number): boolean {
    if (this.isFinished(round)) return false;
    round.answer = { word, score };
    return true;
  }
}

export const letterRoundStore = new LetterRoundStore();
