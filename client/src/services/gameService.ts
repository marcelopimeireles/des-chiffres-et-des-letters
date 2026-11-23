import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/game';

export interface NumbersGame { targetNumber: number; numbers: number[] }
export interface LettersGame { letters: string[] }
export type LetterKind = 'vowel' | 'consonant';
export interface LettersDraw extends LettersGame { choices: LetterKind[] }
export interface DuelGame { type: string; challenge: string; answer: string }
export interface FinalGame { wordSets: string[][] }

export const fetchNumbersGame = async (): Promise<NumbersGame> =>
  (await axios.get<NumbersGame>(`${API_URL}/numbers`)).data;

export const fetchLettersGame = async (): Promise<LettersGame> =>
  (await axios.get<LettersGame>(`${API_URL}/letters`)).data;

export const fetchLettersDraw = async (choices: LetterKind[]): Promise<LettersDraw> =>
  (await axios.post<LettersDraw>(`${API_URL}/letters/draw`, { choices })).data;

export const fetchDuel = async (): Promise<DuelGame> =>
  (await axios.get<DuelGame>(`${API_URL}/duel`)).data;

export const fetchFinalWords = async (): Promise<FinalGame> =>
  (await axios.get<FinalGame>(`${API_URL}/final`)).data;
