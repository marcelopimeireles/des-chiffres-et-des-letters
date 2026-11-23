import { randomUUID } from 'node:crypto';
import { drawNumbers, NumbersSolution } from './numbers';

export const NUMBER_PLAY_SECONDS = 45;
export interface NumberRound {
  drawId: string;
  numbers: number[];
  targetNumber: number;
  largeCount: number;
  createdAt: number;
  deadlineAt: number;
  answer?: { expression: string; value: number; distance: number; score: number };
  solution?: NumbersSolution;
}

/** In-memory provisional game store; the server controls time, score, and tiles. */
export class NumberRoundStore {
  private rounds = new Map<string, NumberRound>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random,
    private readonly ttlMs: number = 5 * 60 * 1000
  ) {}

  create(largeCount: number): NumberRound {
    for (const [id, item] of this.rounds) {
      if (this.now() - item.createdAt > this.ttlMs) this.rounds.delete(id);
    }
    if (this.rounds.size >= 500) {
      const first = this.rounds.keys().next().value;
      if (first) this.rounds.delete(first);
    }
    const createdAt = this.now();
    const round: NumberRound = {
      drawId: randomUUID(),
      largeCount,
      numbers: drawNumbers(largeCount, this.random),
      targetNumber: 101 + Math.floor(this.random() * 899),
      createdAt,
      deadlineAt: createdAt + NUMBER_PLAY_SECONDS * 1000
    };
    this.rounds.set(round.drawId, round);
    return round;
  }

  get(drawId: string): NumberRound | undefined {
    const round = this.rounds.get(drawId);
    if (!round) return undefined;
    if (this.now() - round.createdAt > this.ttlMs) {
      this.rounds.delete(drawId);
      return undefined;
    }
    return round;
  }

  isFinished(round: NumberRound): boolean {
    return Boolean(round.answer) || this.now() >= round.deadlineAt;
  }

  /** Privileged local snapshot. */
  exportState(): NumberRound[] {
    return [...this.rounds.values()];
  }

  restoreState(rows: NumberRound[]): void {
    this.rounds = new Map(
      rows.filter(row => this.now() - row.createdAt <= this.ttlMs)
        .map(row => [row.drawId, row])
    );
  }

  complete(round: NumberRound, expression: string, value: number, score: number): boolean {
    if (this.isFinished(round)) return false;
    round.answer = {
      expression, value, score,
      distance: Math.abs(round.targetNumber - value)
    };
    return true;
  }
}

export const numberRoundStore = new NumberRoundStore();
