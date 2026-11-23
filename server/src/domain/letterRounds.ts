import { randomUUID } from 'node:crypto';
import { drawLetters, LetterKind, WordLanguage } from './letters';

export interface LetterRound {
  drawId: string;
  letters: string[];
  choices: LetterKind[];
  language: WordLanguage;
  createdAt: number;
}

/**
 * In-memory, short-lived source of truth for draw tiles and chosen language.
 * This isn't durable persistence or a server-authoritative match clock yet.
 */
export class LetterRoundStore {
  private rounds = new Map<string, LetterRound>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly ttlMs: number = 5 * 60 * 1000
  ) {}

  create(choices: LetterKind[], language: WordLanguage): LetterRound {
    for (const [id, round] of this.rounds) {
      if (this.now() - round.createdAt > this.ttlMs) this.rounds.delete(id);
    }
    // Bound memory even if clients create many rounds.
    if (this.rounds.size >= 500) {
      const oldest = this.rounds.keys().next().value;
      if (oldest) this.rounds.delete(oldest);
    }
    const round: LetterRound = {
      drawId: randomUUID(),
      choices: [...choices],
      language,
      letters: drawLetters(choices, Math.random, language),
      createdAt: this.now()
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
}

export const letterRoundStore = new LetterRoundStore();
