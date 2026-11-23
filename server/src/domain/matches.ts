import { randomUUID } from 'node:crypto';
import { LetterRoundStore, letterRoundStore } from './letterRounds';
import { LetterKind, WordLanguage, shuffle } from './letters';
import { NumberRoundStore, numberRoundStore } from './numberRounds';
import { DuelKind, DuelRoundStore, duelRoundStore } from './duels';
import { FinaleRoundStore, finaleRoundStore } from './finale';

export type MatchRoundKind = 'letters' | 'numbers' | 'duel' | 'final';
export const SOLO_SEQUENCE: readonly MatchRoundKind[] = [
  'letters', 'numbers', 'letters', 'numbers', 'letters', 'numbers',
  'duel', 'duel', 'final'
];

/** Provisional nine-stage solo format: six classical rounds, two duels, one eight-word finale. */
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
  duelKind?: DuelKind;
  challenge?: string;
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
  duelKind?: DuelKind;
  challenge?: string;
  finaleIndex?: number;
  finaleTotal?: number;
  finaleScore?: number;
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
 * The match never accepts client scores. They come only from the four
 * authoritative domain stores. Memory-only until server persistence is added.
 */
export class SoloMatchStore {
  private readonly matches = new Map<string, SoloMatch>();
  private readonly byDraw = new Map<string, string>();

  constructor(
    private readonly letters: LetterRoundStore = letterRoundStore,
    private readonly numbers: NumberRoundStore = numberRoundStore,
    private readonly now: () => number = Date.now,
    private readonly ttlMs = 60 * 60 * 1000,
    private readonly duels: DuelRoundStore = duelRoundStore,
    private readonly finals: FinaleRoundStore = finaleRoundStore
  ) {}

  create(config: MatchConfig): SoloMatchSnapshot {
    if (!Number.isInteger(config.largeCount) || config.largeCount < 0 ||
        config.largeCount > 4 || !['en', 'pt', 'fr'].includes(config.language)) {
      throw new Error('Invalid solo match configuration.');
    }
    this.prune();
    if (this.matches.size >= 300) {
      const oldest = this.matches.keys().next().value;
      if (oldest) this.remove(oldest);
    }
    const match: SoloMatch = {
      matchId: randomUUID(), createdAt: this.now(),
      config: { ...config }, currentIndex: 0, entries: []
    };
    this.matches.set(match.matchId, match);
    this.addRound(match);
    return this.snapshot(match.matchId)!;
  }

  get(matchId: string): SoloMatchSnapshot | undefined {
    return this.snapshot(matchId);
  }

  next(matchId: string): SoloMatchSnapshot | 'missing' | 'active' {
    const match = this.find(matchId);
    if (!match) return 'missing';
    if (match.currentIndex === SOLO_SEQUENCE.length) return this.snapshot(matchId)!;
    const entry = match.entries[match.currentIndex];
    if (!entry || !this.capture(entry)) return 'active';
    this.byDraw.delete(entry.drawId);
    match.currentIndex += 1;
    if (match.currentIndex < SOLO_SEQUENCE.length) this.addRound(match);
    return this.snapshot(matchId)!;
  }

  /** Called by validation endpoints after they have persisted a valid answer. */
  markResolved(drawId: string): void {
    const matchId = this.byDraw.get(drawId);
    if (!matchId) return;
    const match = this.find(matchId);
    const entry = match?.entries.find(item => item.drawId === drawId);
    if (entry) this.capture(entry);
  }

  private capture(entry: MatchEntry): boolean {
    if (entry.result) return true;
    let score = 0;
    let answer: string | null = null;
    if (entry.kind === 'letters') {
      const round = this.letters.get(entry.drawId);
      if (round && !this.letters.isFinished(round)) return false;
      score = round?.answer?.score ?? 0;
      answer = round?.answer?.word ?? null;
    } else if (entry.kind === 'numbers') {
      const round = this.numbers.get(entry.drawId);
      if (round && !this.numbers.isFinished(round)) return false;
      score = round?.answer?.score ?? 0;
      answer = round?.answer?.expression ?? null;
    } else if (entry.kind === 'duel') {
      const round = this.duels.get(entry.drawId);
      if (round && !this.duels.isFinished(round)) return false;
      score = round?.score ?? 0;
      answer = round?.answer ?? null;
    } else {
      const round = this.finals.get(entry.drawId);
      if (round && !this.finals.isFinished(round)) return false;
      score = round?.score ?? 0;
      if (round) {
        const correct = round.items.filter(item => Boolean(item.answer)).length;
        answer = `${correct} / ${round.items.length} mots`;
      }
    }
    entry.result = { kind: entry.kind, index: entry.index, drawId: entry.drawId, score, answer };
    this.byDraw.delete(entry.drawId);
    return true;
  }

  private snapshot(matchId: string): SoloMatchSnapshot | undefined {
    const match = this.find(matchId);
    if (!match) return undefined;
    const entry = match.entries[match.currentIndex];
    if (entry) this.capture(entry);
    const finished = match.currentIndex === SOLO_SEQUENCE.length;
    const history = match.entries.filter(item => Boolean(item.result)).map(item => ({ ...item.result! }));
    let current: ActiveMatchRound | null = null;
    if (!finished && entry) {
      current = {
        kind: entry.kind, index: entry.index,
        drawId: entry.drawId, deadlineAt: entry.deadlineAt
      };
      if (entry.kind === 'letters') current.letters = [...(entry.letters || [])];
      if (entry.kind === 'numbers') {
        current.numbers = [...(entry.numbers || [])];
        current.targetNumber = entry.targetNumber;
      }
      if (entry.kind === 'duel') {
        current.duelKind = entry.duelKind;
        current.challenge = entry.challenge;
        current.letters = entry.letters ? [...entry.letters] : undefined;
      }
      if (entry.kind === 'final') {
        const finale = this.finals.get(entry.drawId);
        const step = finale && this.finals.current(finale);
        current.letters = step?.letters || [];
        current.finaleIndex = finale?.currentIndex ?? 0;
        current.finaleTotal = finale?.items.length ?? 8;
        current.finaleScore = finale?.score ?? 0;
      }
    }
    return {
      matchId, language: match.config.language, largeCount: match.config.largeCount,
      totalRounds: SOLO_SEQUENCE.length, currentIndex: match.currentIndex,
      status: finished ? 'finished' : entry?.result ? 'review' : 'playing',
      totalScore: history.reduce((sum, item) => sum + item.score, 0),
      history, current
    };
  }

  private addRound(match: SoloMatch): void {
    const kind = SOLO_SEQUENCE[match.currentIndex];
    let entry: MatchEntry;
    if (kind === 'letters') {
      const choices: LetterKind[] = shuffle([
        ...Array<LetterKind>(5).fill('vowel'),
        ...Array<LetterKind>(5).fill('consonant')
      ]);
      const round = this.letters.create(choices, match.config.language);
      entry = { kind, index: match.currentIndex, drawId: round.drawId,
        deadlineAt: round.deadlineAt, letters: [...round.letters] };
    } else if (kind === 'numbers') {
      const round = this.numbers.create(match.config.largeCount);
      entry = { kind, index: match.currentIndex, drawId: round.drawId,
        deadlineAt: round.deadlineAt, numbers: [...round.numbers],
        targetNumber: round.targetNumber };
    } else if (kind === 'duel') {
      const duelKind: DuelKind = match.currentIndex === 6 ? 'anagram' : 'mental';
      const round = this.duels.create(duelKind, match.config.language);
      entry = { kind, index: match.currentIndex, drawId: round.drawId,
        deadlineAt: round.deadlineAt, duelKind, challenge: round.challenge,
        letters: round.letters && [...round.letters] };
    } else {
      const round = this.finals.create(match.config.language);
      entry = { kind, index: match.currentIndex, drawId: round.drawId,
        deadlineAt: round.deadlineAt };
    }
    match.entries.push(entry);
    this.byDraw.set(entry.drawId, match.matchId);
  }

  private find(id: string): SoloMatch | undefined {
    const match = this.matches.get(id);
    if (!match) return undefined;
    if (this.now() - match.createdAt > this.ttlMs) {
      this.remove(id);
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
