import {
  closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync,
  renameSync, rmSync, writeFileSync
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LetterRoundStore, letterRoundStore } from '../domain/letterRounds';
import { NumberRoundStore, numberRoundStore } from '../domain/numberRounds';
import { DuelRoundStore, duelRoundStore } from '../domain/duels';
import { FinaleRoundStore, finaleRoundStore } from '../domain/finale';
import { SoloMatchStore, soloMatchStore, SOLO_SEQUENCE } from '../domain/matches';
import { isWordLanguage } from '../domain/letters';

export interface RuntimeGameStores {
  letters: LetterRoundStore;
  numbers: NumberRoundStore;
  duels: DuelRoundStore;
  finals: FinaleRoundStore;
  matches: SoloMatchStore;
}

const globalStores: RuntimeGameStores = {
  letters: letterRoundStore,
  numbers: numberRoundStore,
  duels: duelRoundStore,
  finals: finaleRoundStore,
  matches: soloMatchStore
};

interface StoredGameState {
  version: 1;
  savedAt: number;
  letters: ReturnType<LetterRoundStore['exportState']>;
  numbers: ReturnType<NumberRoundStore['exportState']>;
  duels: ReturnType<DuelRoundStore['exportState']>;
  finals: ReturnType<FinaleRoundStore['exportState']>;
  matches: ReturnType<SoloMatchStore['exportState']>;
}

const UUID = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
type Row = Record<string, unknown>;
const isRow = (data: unknown): data is Row =>
  data !== null && typeof data === 'object' && !Array.isArray(data);
const isNonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isWords = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(letter => typeof letter === 'string');
const isValidRound = (item: Row): boolean =>
  typeof item.drawId === 'string' && UUID.test(item.drawId) &&
  isNonnegative(item.createdAt) && isNonnegative(item.deadlineAt) &&
  (item.deadlineAt as number) >= (item.createdAt as number);
const isValidResult = (answer: unknown) =>
  answer === undefined || (isRow(answer) && isNonnegative(answer.score));

function assertArray(
  value: unknown, name: string, max: number, validate: (item: Row) => boolean
): asserts value is Row[] {
  if (!Array.isArray(value) || value.length > max ||
      value.some(item => !isRow(item) || !validate(item))) {
    throw new Error('Invalid game state: ' + name);
  }
}

function parseGameState(raw: string): StoredGameState {
  if (Buffer.byteLength(raw, 'utf8') > 16 * 1024 * 1024) {
    throw new Error('Game state is larger than the supported limit.');
  }
  const value: unknown = JSON.parse(raw);
  if (!isRow(value) || value.version !== 1 || !isNonnegative(value.savedAt)) {
    throw new Error('Unsupported or corrupted game state format.');
  }
  assertArray(value.letters, 'letters', 500, item =>
    isValidRound(item) && isWordLanguage(item.language) &&
    isWords(item.letters) && item.letters.length === 10 &&
    isWords(item.choices) && item.choices.length === 10 &&
    (item.choices as string[]).every(choice =>
      choice === 'vowel' || choice === 'consonant') &&
    isValidResult(item.answer)
  );
  assertArray(value.numbers, 'numbers', 500, item =>
    isValidRound(item) && Array.isArray(item.numbers) &&
    item.numbers.length === 6 &&
    item.numbers.every((n: unknown) => isNonnegative(n) && n > 0) &&
    isNonnegative(item.targetNumber) && isNonnegative(item.largeCount) &&
    isValidResult(item.answer)
  );
  assertArray(value.duels, 'duels', 500, item =>
    isValidRound(item) && (item.kind === 'anagram' || item.kind === 'mental') &&
    isWordLanguage(item.language) && typeof item.expected === 'string' &&
    typeof item.challenge === 'string' && isNonnegative(item.score) &&
    (item.answer === undefined || typeof item.answer === 'string')
  );
  assertArray(value.finals, 'finals', 300, item =>
    isValidRound(item) && isWordLanguage(item.language) &&
    isNonnegative(item.score) && isNonnegative(item.currentIndex) &&
    item.currentIndex <= 8 && Array.isArray(item.items) &&
    item.items.length === 8 &&
    item.items.every((v: unknown) => isRow(v) &&
      isWords(v.letters) && v.letters.length === 10 &&
      typeof v.target === 'string' &&
      (v.answer === undefined || v.answer === null || typeof v.answer === 'string') &&
      (v.score === undefined || isNonnegative(v.score)))
  );
  assertArray(value.matches, 'matches', 300, item =>
    typeof item.matchId === 'string' && UUID.test(item.matchId) &&
    isNonnegative(item.createdAt) && isNonnegative(item.currentIndex) &&
    item.currentIndex <= SOLO_SEQUENCE.length &&
    isRow(item.config) && isWordLanguage(item.config.language) &&
    isNonnegative(item.config.largeCount) && item.config.largeCount <= 4 &&
    Array.isArray(item.entries) &&
    item.entries.length === Math.min(item.currentIndex + 1, SOLO_SEQUENCE.length) &&
    item.entries.every((entry: unknown, index: number) =>
      isRow(entry) && isValidRound({
        ...entry, createdAt: item.createdAt
      }) && entry.kind === SOLO_SEQUENCE[index] &&
      entry.index === index &&
      (entry.result === undefined ||
        (isRow(entry.result) && entry.result.kind === entry.kind &&
          entry.result.drawId === entry.drawId &&
          entry.result.index === index &&
          isNonnegative(entry.result.score) &&
          (entry.result.answer === null || typeof entry.result.answer === 'string')))
    )
  );
  return value as unknown as StoredGameState;
}

/**
 * One-process, one-filesystem persistence. Each successful API mutation writes
 * a full versioned state snapshot to a private temp file and atomically renames
 * it into place. No extra database/service dependency for this MVP.
 *
 * Not safe for several Express processes sharing the same file. Use a
 * transactional shared database before deploying horizontal replicas.
 */
export class GameStatePersistence {
  constructor(
    private readonly file: string,
    private readonly stores: RuntimeGameStores
  ) {}

  load(): boolean {
    if (!existsSync(this.file)) return false;
    const parsed = parseGameState(readFileSync(this.file, 'utf8'));
    // Validate every section before mutating any store: a corrupted file
    // aborts startup instead of silently resetting players' scores.
    this.stores.letters.restoreState(parsed.letters);
    this.stores.numbers.restoreState(parsed.numbers);
    this.stores.duels.restoreState(parsed.duels);
    this.stores.finals.restoreState(parsed.finals);
    this.stores.matches.restoreState(parsed.matches);
    return true;
  }

  save(): void {
    const contents: StoredGameState = {
      version: 1,
      savedAt: Date.now(),
      letters: this.stores.letters.exportState(),
      numbers: this.stores.numbers.exportState(),
      duels: this.stores.duels.exportState(),
      finals: this.stores.finals.exportState(),
      matches: this.stores.matches.exportState()
    };
    const path = resolve(this.file);
    const directory = dirname(path);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = path + '.' + process.pid + '.' + randomUUID() + '.tmp';
    try {
      writeFileSync(temporary, JSON.stringify(contents), { mode: 0o600, flag: 'wx' });
      const fd = openSync(temporary, 'r');
      try { fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temporary, path);
    } catch (error) {
      rmSync(temporary, { force: true });
      throw error;
    }
  }
}

let enabled: GameStatePersistence | null = null;

export function enableGameStatePersistence(file: string): void {
  const persistence = new GameStatePersistence(resolve(file), globalStores);
  persistence.load();
  // Enable saving only after a valid snapshot has been completely restored.
  enabled = persistence;
  console.log('Game state persistence enabled:', resolve(file));
}

export function saveGameStateIfEnabled(): void {
  enabled?.save();
}

/** Primarily for isolated HTTP integration tests. */
export function disableGameStatePersistence(): void {
  enabled = null;
}
