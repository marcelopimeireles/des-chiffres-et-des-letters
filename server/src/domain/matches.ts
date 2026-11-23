import { randomUUID } from 'node:crypto';
import { LetterRoundStore, letterRoundStore } from './letterRounds';
import { LetterKind, WordLanguage, shuffle } from './letters';
import { NumberRoundStore, numberRoundStore } from './numberRounds';

export type MatchRoundKind = 'letters' | 'numbers';
export const SOLO_SEQUENCE: readonly MatchRoundKind[] = [
  'letters', 'numbers', 'letters', 'numbers', 'letters', 'numbers'
];

/** Provisional solo format: three letters and three numbers rounds. */
export interface MatchConfig {
  language: WordLanguage;
  largeCount: number;
}

export interface MatchResult {
  kind: MatchRoundKind;
  index: number;
  drawId: string;
  score: number;
  answer: string | null;
}

interface MatchEntry {
  kind: MatchRoundKind;
  index: number;
  drawId: string;
  deadlineAt: number;
  letters?: string[];
  numbers?: number[];
  targetNumber?: number;
  result?: MatchResult;
}

interface SoloMatch {
  matchId: string;
  createdAt: number;
  config: MatchConfig;
  currentIndex: number;
  entries: MatchEntry[];
}

export interface ActiveMatchRound {
  kind: MatchRoundKind;
  index: number;
  drawId: string;
  deadlineAt: number;
  letters?: string[];
  numbers?: number[];
  targetNumber?: number;
}

export interface SoloMatchSnapshot {
  matchId: string;
  language: WordLanguage;
  largeCount: number;
  totalRounds: number;
  currentIndex: number;
  status: 'playing' | 'review' | 'finished';
  totalScore: number;
  history: MatchResult[];
  current: ActiveMatchRound | null;
}

/**
 * Scores are read from the existing round stores, never from client claims.
 * A resolved result is copied into the match when the underlying round finishes,
 * so score history can survive the shorter 5-minute round TTL.
 * A match itself is memory-only and expires after one hour.
 */
export class SoloMatchStore {
  private readonly matches = new Map<string, SoloMatch>();
  private readonly byDraw = new Map<string, string>();

  constructor(
    private readonly letters: LetterRoundStore = letterRoundStore,
    private readonly numbers: NumberRoundStore = numberRoundStore,
    private readonly now: () => number = Date.now,
    private readonly ttlMs = 60 * 60 * 1000
  ) {}

  create(config: MatchConfig): SoloMatchSnapshot {
    if (!Number.isInteger(config.largeCount) || config.largeCount < 0 ||
        config.largeCount > 4 || !['en','pt','fr'].includes(config.language)) {
      throw new Error('Invalid solo match configuration.');
    }
    this.prune();
    if (this.matches.size >= 300) {
      const oldest = this.matches.keys().next().value;
      if (oldest) this.remove(oldest);
    }
    const match: SoloMatch = {
      matchId: randomUUID(),
      createdAt: this.now(),
      config: { ...config },
      currentIndex: 0,
      entries: []
    };
    this.matches.set(match.matchId, match);
    this.addRound(match);
    return this.snapshot(match.matchId)!;
  }

  get(matchId: string): SoloMatchSnapshot | undefined {
    const match = this.find(matchId);
    return match && this.snapshot(matchId);
  }

  next(matchId: string): SoloMatchSnapshot | 'missing' | 'active' {
    const match = this.find(matchId);
    if (!match) return 'missing';
    const entry = match.entries[match.currentIndex];
    if (!entry || !this.capture(entry)) return 'active';
    this.byDraw.delete(entry.drawId);
    if (match.currentIndex + 1 >= SOLO_SEQUENCE.length) {
      match.currentIndex = SOLO_SEQUENCE.length;
    } else {
      match.currentIndex += 1;
      this.addRound(match);
    }
    return this.snapshot(matchId)!;
  }

  /** Called by standalone validation controllers once a round is awarded. */
  markResolved(drawId: string): void {
    const matchId = this.byDraw.get(drawId);
    if (!matchId) return;
    const match = this.find(matchId);
    const entry = match?.entries.find(item => item.drawId === drawId);
    if (entry) this.capture(entry);
  }

  private capture(entry: MatchEntry): boolean {
    if (entry.result) return true;
    if (entry.kind === 'letters') {
      const round = this.letters.get(entry.drawId);
      if (round && !this.letters.isFinished(round)) return false;
      entry.result = {
        kind: 'letters', index: entry.index, drawId: entry.drawId,
        score: round?.answer?.score ?? 0, answer: round?.answer?.word ?? null
      };
    } else {
      const round = this.numbers.get(entry.drawId);
      if (round && !this.numbers.isFinished(round)) return false;
      entry.result = {
        kind: 'numbers', index: entry.index, drawId: entry.drawId,
        score: round?.answer?.score ?? 0, answer: round?.answer?.expression ?? null
      };
    }
    this.byDraw.delete(entry.drawId);
    return true;
  }

  private snapshot(matchId: string): SoloMatchSnapshot | undefined {
    const match = this.find(matchId);
    if (!match) return undefined;
    const last = match.entries[match.currentIndex];
    if (last) this.capture(last);
    const finished = match.currentIndex === SOLO_SEQUENCE.length;
    const history = match.entries
      .filter(entry => Boolean(entry.result))
      .map(entry => ({ ...entry.result! }));
    const active = !finished && last ? {
      kind: last.kind, index: last.index, drawId: last.drawId,
      deadlineAt: last.deadlineAt,
      ...(last.kind === 'letters' ? { letters: last.letters } :
        { numbers: last.numbers, targetNumber: last.targetNumber })
    } : null;
    return {
      matchId: match.matchId,
      language: match.config.language,
      largeCount: match.config.largeCount,
      totalRounds: SOLO_SEQUENCE.length,
      currentIndex: match.currentIndex,
      status: finished ? 'finished' : last?.result ? 'review' : 'playing',
      totalScore: history.reduce((sum, entry) => sum + entry.score, 0),
      history,
      current: active
    };
  }

  private addRound(match: SoloMatch): void {
    const kind = SOLO_SEQUENCE[match.currentIndex];
    let entry: MatchEntry;
    if (kind === 'letters') {
      const kinds: LetterKind[] = shuffle([
        ...Array<LetterKind>(5).fill('vowel'),
        ...Array<LetterKind>(5).fill('consonant')
      ]);
      const round = this.letters.create(kinds, match.config.language);
      entry = {
        kind, index: match.currentIndex, drawId: round.drawId,
        deadlineAt: round.deadlineAt, letters: [...round.letters]
      };
    } else {
      const round = this.numbers.create(match.config.largeCount);
      entry = {
        kind, index: match.currentIndex, drawId: round.drawId,
        deadlineAt: round.deadlineAt,
        numbers: [...round.numbers], targetNumber: round.targetNumber
      };
    }
    match.entries.push(entry);
    this.byDraw.set(entry.drawId, match.matchId);
  }

  private find(matchId: string): SoloMatch | undefined {
    const match = this.matches.get(matchId);
    if (!match) return undefined;
    if (this.now() - match.createdAt > this.ttlMs) {
      this.remove(matchId);
      return undefined;
    }
    return match;
  }

  private prune(): void {
    for (const [id, match] of this.matches) {
      if (this.now() - match.createdAt > this.ttlMs) this.remove(id);
    }
  }

  private remove(id: string): void {
    const match = this.matches.get(id);
    if (!match) return;
    for (const entry of match.entries) this.byDraw.delete(entry.drawId);
    this.matches.delete(id);
  }
}

export const soloMatchStore = new SoloMatchStore();
