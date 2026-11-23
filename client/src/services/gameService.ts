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
