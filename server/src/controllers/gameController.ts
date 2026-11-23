import { Request, Response } from 'express';
import {
  canMakeWordFromTiles, drawLetters, isLetterChoices, isWordLanguage,
  LetterKind, normalizeCandidate, shuffle, WordLanguage
} from '../domain/letters';
import { letterRoundStore } from '../domain/letterRounds';
import { DictionaryUnavailableError, lookupDictionaryWord } from '../services/dictionary';

const numberPool = [25, 50, 75, 100,
  ...Array.from({ length: 10 }, (_, i) => i + 1),
  ...Array.from({ length: 10 }, (_, i) => i + 1)
];

export const getNumbersGame = (_req: Request, res: Response) => {
  const targetNumber = Math.floor(Math.random() * 899) + 101;
  res.json({ targetNumber, numbers: shuffle(numberPool).slice(0, 6) });
};

export const getLettersGame = (_req: Request, res: Response) => {
  // Legacy endpoint, default French. New game uses POST /letters/draw.
  const kinds: LetterKind[] = shuffle([
    ...Array<LetterKind>(5).fill('vowel'), ...Array<LetterKind>(5).fill('consonant')
  ]);
  res.json({ letters: drawLetters(kinds) });
};

export const createLettersDraw = (req: Request, res: Response) => {
  const choices: unknown = req.body?.choices;
  const language: unknown = req.body?.language ?? 'fr';
  if (!isLetterChoices(choices) || !isWordLanguage(language)) {
    res.status(400).json({
      error: 'Expected language en, pt or fr, and exactly 10 choices of vowel or consonant.'
    });
    return;
  }
  const draw = letterRoundStore.create(choices, language);
  res.json({ drawId: draw.drawId, letters: draw.letters, choices: draw.choices, language });
};

export const validateLettersWord = async (req: Request, res: Response) => {
  const { drawId, word } = req.body || {};
  if (typeof drawId !== 'string' || !/^[a-f0-9-]{36}$/.test(drawId) ||
      typeof word !== 'string' || word.length > 40) {
    res.status(400).json({ error: 'Expected drawId and a single word (max 10 letters).' });
    return;
  }
  const round = letterRoundStore.get(drawId);
  if (!round) {
    res.status(404).json({ error: 'Draw not found or expired. Start a new round.' });
    return;
  }
  const normalized = normalizeCandidate(word);
  if (!normalized) {
    res.status(200).json({ valid: false, reason: 'invalid_format', language: round.language });
    return;
  }
  if (!canMakeWordFromTiles(normalized, round.letters)) {
    res.status(200).json({ valid: false, reason: 'letters_mismatch', language: round.language });
    return;
  }
  try {
    const inDictionary = await lookupDictionaryWord(round.language, normalized);
    res.status(200).json({
      valid: inDictionary,
      reason: inDictionary ? 'accepted' : 'not_in_dictionary',
      language: round.language,
      word: normalized,
      source: 'dictionaryapi.dev'
    });
  } catch (error) {
    if (!(error instanceof DictionaryUnavailableError)) console.error(error);
    res.status(503).json({
      error: 'Dictionary is temporarily unavailable. Please retry.',
      code: 'dictionary_unavailable'
    });
  }
};

export const getDuel = (_req: Request, res: Response) => {
  res.json({ type: 'traditional', challenge: 'RAAUBITIAH', answer: 'ARUBA HAITI' });
};

export const getFinalWords = (_req: Request, res: Response) => {
  res.json({ wordSets: [['T', 'O', 'C', 'E', 'D', 'A', 'M', 'I', 'T', 'Q']] });
};
