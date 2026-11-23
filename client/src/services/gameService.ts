import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/game';

export interface NumbersGame { targetNumber: number; numbers: number[] }

export interface NumbersDraw extends NumbersGame {
  drawId: string;
  largeCount: number;
  deadlineAt: number;
  playSeconds: number;
}

export type NumberOperator = '+' | '-' | '*' | '/';
export interface NumberCalculationStep {
  left: number;
  operator: NumberOperator;
  right: number;
  result: number;
}

export interface NumbersSolution {
  value: number;
  distance: number;
  exact: boolean;
  expression: string;
  steps: NumberCalculationStep[];
  usedTiles: number[];
}

export interface NumbersValidation {
  valid: boolean;
  reason: 'accepted' | 'invalid_expression';
  error?: string;
  value?: number;
  distance?: number;
  exact?: boolean;
  score: number;
  solution?: NumbersSolution | null;
}

export interface NumbersSolutions {
  targetNumber: number;
  score: number;
  submittedValue: number | null;
  solution: NumbersSolution;
}
export interface LettersGame { letters: string[] }
export type LetterKind = 'vowel' | 'consonant';
export type WordLanguage = 'en' | 'pt' | 'fr';

export interface LettersDraw extends LettersGame {
  choices: LetterKind[];
  drawId: string;
  language: WordLanguage;
  deadlineAt: number;
  revealDurationMs: number;
  playSeconds: number;
}

export interface LetterSolutions {
  bestLength: number;
  bestWords: string[];
  lexiconEntries: number;
  language?: WordLanguage;
  score?: number;
}

export type WordValidationReason =
  'accepted' | 'not_in_dictionary' | 'letters_mismatch' | 'invalid_format';

export interface WordValidation {
  valid: boolean;
  reason: WordValidationReason;
  language: WordLanguage;
  word?: string;
  score: number;
  source?: string;
  solutions?: LetterSolutions;
}

export interface DuelGame { type: string; challenge: string; answer: string }
export interface FinalGame { wordSets: string[][] }

export const fetchNumbersGame = async (): Promise<NumbersGame> =>
  (await axios.get<NumbersGame>(`${API_URL}/numbers`)).data;

export const fetchNumbersDraw = async (largeCount: number): Promise<NumbersDraw> =>
  (await axios.post<NumbersDraw>(`${API_URL}/numbers/draw`, { largeCount })).data;

export const validateNumbersAnswer = async (
  drawId: string, expression: string
): Promise<NumbersValidation> =>
  (await axios.post<NumbersValidation>(`${API_URL}/numbers/validate`, { drawId, expression })).data;

export const fetchNumbersSolutions = async (drawId: string): Promise<NumbersSolutions> =>
  (await axios.get<NumbersSolutions>(
    `${API_URL}/numbers/${encodeURIComponent(drawId)}/solutions`
  )).data;

export const fetchLettersGame = async (): Promise<LettersGame> =>
  (await axios.get<LettersGame>(`${API_URL}/letters`)).data;

export const fetchLettersDraw = async (
  choices: LetterKind[], language: WordLanguage = 'fr'
): Promise<LettersDraw> =>
  (await axios.post<LettersDraw>(`${API_URL}/letters/draw`, { choices, language })).data;

export const validateLettersWord = async (
  drawId: string, word: string
): Promise<WordValidation> =>
  (await axios.post<WordValidation>(`${API_URL}/letters/validate`, { drawId, word })).data;

export const fetchLettersSolutions = async (drawId: string): Promise<LetterSolutions> =>
  (await axios.get<LetterSolutions>(`${API_URL}/letters/${encodeURIComponent(drawId)}/solutions`)).data;

export const fetchDuel = async (): Promise<DuelGame> =>
  (await axios.get<DuelGame>(`${API_URL}/duel`)).data;

export const fetchFinalWords = async (): Promise<FinalGame> =>
  (await axios.get<FinalGame>(`${API_URL}/final`)).data;

/** A match links only server-created/validated letter and number rounds. */
export type SoloMatchRoundKind = 'letters' | 'numbers' | 'duel' | 'final';

export interface SoloMatchRound {
  kind: SoloMatchRoundKind;
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

export interface SoloMatchResult {
  kind: SoloMatchRoundKind;
  index: number;
  drawId: string;
  score: number;
  answer: string | null;
}

export interface SoloMatch {
  matchId: string;
  language: WordLanguage;
  largeCount: number;
  totalRounds: number;
  currentIndex: number;
  status: 'playing' | 'review' | 'finished';
  totalScore: number;
  history: SoloMatchResult[];
  current: SoloMatchRound | null;
}

export const createSoloMatch = async (
  language: WordLanguage, largeCount: number
): Promise<SoloMatch> =>
  (await axios.post<SoloMatch>(`${API_URL}/matches`, { language, largeCount })).data;

export const fetchSoloMatch = async (id: string): Promise<SoloMatch> =>
  (await axios.get<SoloMatch>(`${API_URL}/matches/${encodeURIComponent(id)}`)).data;

export const nextSoloRound = async (id: string): Promise<SoloMatch> =>
  (await axios.post<SoloMatch>(`${API_URL}/matches/${encodeURIComponent(id)}/next`)).data;

/** Real playable challenges. The server does not send secret words before completion. */
export type DuelKind = 'anagram' | 'mental';
export interface DuelRound {
  drawId: string;
  kind: DuelKind;
  language: WordLanguage;
  challenge: string;
  letters?: string[];
  operands?: number[];
  operator?: '+' | '-' | '*';
  deadlineAt: number;
  finished: boolean;
  score: number;
}
export interface DuelAttempt {
  valid: boolean;
  reason: 'accepted' | 'wrong_answer' | 'invalid_format';
  score: number;
}
export interface DuelSolution { answer: string; score: number }

export interface FinaleRound {
  drawId: string;
  language: WordLanguage;
  deadlineAt: number;
  totalItems: number;
  currentIndex: number;
  score: number;
  finished: boolean;
  current: { index: number; letters: string[] } | null;
}
export interface FinaleAttempt {
  valid: boolean;
  reason: 'accepted' | 'invalid_format' | 'letters_mismatch' | 'not_in_dictionary';
  score: number;
  currentIndex: number;
  finished: boolean;
  round: FinaleRound;
}
export interface FinaleSolutions {
  score: number;
  words: Array<{ target: string; answer: string | null; score: number }>;
}

export const createDuelDraw = async (kind: DuelKind, language: WordLanguage): Promise<DuelRound> =>
  (await axios.post<DuelRound>(`${API_URL}/duels/draw`, { kind, language })).data;
export const fetchDuelDraw = async (id: string): Promise<DuelRound> =>
  (await axios.get<DuelRound>(`${API_URL}/duels/${encodeURIComponent(id)}`)).data;
export const validateDuelAnswer = async (drawId: string, answer: string): Promise<DuelAttempt> =>
  (await axios.post<DuelAttempt>(`${API_URL}/duels/validate`, { drawId, answer })).data;
export const fetchDuelSolution = async (id: string): Promise<DuelSolution> =>
  (await axios.get<DuelSolution>(`${API_URL}/duels/${encodeURIComponent(id)}/solution`)).data;

export const createFinaleDraw = async (language: WordLanguage): Promise<FinaleRound> =>
  (await axios.post<FinaleRound>(`${API_URL}/finale/draw`, { language })).data;
export const fetchFinaleDraw = async (id: string): Promise<FinaleRound> =>
  (await axios.get<FinaleRound>(`${API_URL}/finale/${encodeURIComponent(id)}`)).data;
export const validateFinaleWord = async (
  drawId: string, index: number, word: string
): Promise<FinaleAttempt> =>
  (await axios.post<FinaleAttempt>(`${API_URL}/finale/validate`, { drawId, index, word })).data;
export const skipFinaleWord = async (drawId: string, index: number): Promise<FinaleRound> =>
  (await axios.post<FinaleRound>(`${API_URL}/finale/skip`, { drawId, index })).data;
export const fetchFinaleSolutions = async (id: string): Promise<FinaleSolutions> =>
  (await axios.get<FinaleSolutions>(`${API_URL}/finale/${encodeURIComponent(id)}/solutions`)).data;
