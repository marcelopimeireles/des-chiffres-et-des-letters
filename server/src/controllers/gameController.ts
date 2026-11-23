import { Request, Response } from 'express';
import {
  canMakeWordFromTiles, drawLetters, isLetterChoices, isWordLanguage,
  LetterKind, normalizeCandidate, shuffle, tileLetters
} from '../domain/letters';
import {
  LETTER_PLAY_SECONDS, LETTER_REVEAL_MS, letterRoundStore
} from '../domain/letterRounds';
import { getLexicon, lookupDictionaryWord, solveLetters } from '../services/dictionary';

const numberPool = [25, 50, 75, 100,
  ...Array.from({ length: 10 }, (_, i) => i + 1),
  ...Array.from({ length: 10 }, (_, i) => i + 1)
];
const uuidPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export const getNumbersGame = (_req: Request, res: Response) => {
  res.json({
    targetNumber: Math.floor(Math.random() * 899) + 101,
    numbers: shuffle(numberPool).slice(0, 6)
  });
};

export const getLettersGame = (_req: Request, res: Response) => {
  const kinds: LetterKind[] = shuffle([
    ...Array<LetterKind>(5).fill('vowel'),
    ...Array<LetterKind>(5).fill('consonant')
  ]);
  res.json({ letters: drawLetters(kinds) });
};

export const createLettersDraw = (req: Request, res: Response) => {
  const choices: unknown = req.body?.choices;
  const language: unknown = req.body?.language ?? 'fr';
  if (!isLetterChoices(choices) || !isWordLanguage(language)) {
    res.status(400).json({
      error: 'Expected language en, pt or fr and exactly 10 choices of vowel or consonant.'
    });
    return;
  }
  try {
    // Do not create unplayable rounds if their local word list is missing.
    getLexicon(language);
    const round = letterRoundStore.create(choices, language);
    res.json({
      drawId: round.drawId, letters: round.letters, choices: round.choices,
      language, deadlineAt: round.deadlineAt,
      revealDurationMs: LETTER_REVEAL_MS, playSeconds: LETTER_PLAY_SECONDS
    });
  } catch (error) {
    console.error('Unable to load local dictionary', error);
    res.status(503).json({ code: 'lexicon_unavailable', error: 'Local dictionary unavailable.' });
  }
};

export const validateLettersWord = (req: Request, res: Response) => {
  const { drawId, word } = req.body || {};
  if (typeof drawId !== 'string' || !uuidPattern.test(drawId) ||
      typeof word !== 'string' || word.length > 40) {
    res.status(400).json({ error: 'Expected drawId and a single word of up to 10 letters.' });
    return;
  }
  const round = letterRoundStore.get(drawId);
  if (!round) {
    res.status(404).json({ code: 'round_missing', error: 'Draw not found or expired.' });
    return;
  }
  if (letterRoundStore.isFinished(round)) {
    res.status(409).json({ code: 'round_finished', error: 'Round already finished or time expired.' });
    return;
  }
  const normalized = normalizeCandidate(word);
  if (!normalized) {
    res.json({ valid: false, reason: 'invalid_format', language: round.language, score: 0 });
    return;
  }
  if (!canMakeWordFromTiles(normalized, round.letters)) {
    res.json({ valid: false, reason: 'letters_mismatch', language: round.language, score: 0 });
    return;
  }
  try {
    const canonical = lookupDictionaryWord(round.language, normalized);
    if (!canonical) {
      res.json({
        valid: false, reason: 'not_in_dictionary', language: round.language, score: 0
      });
      return;
    }
    const score = tileLetters(canonical).length;
    if (!letterRoundStore.complete(round, canonical, score)) {
      res.status(409).json({ code: 'round_finished', error: 'Round already finished.' });
      return;
    }
    res.json({
      valid: true, reason: 'accepted', language: round.language,
      word: canonical, score, source: 'local-lexicon',
      solutions: solveLetters(round.language, round.letters)
    });
  } catch (error) {
    console.error('Local dictionary error', error);
    res.status(503).json({ code: 'lexicon_unavailable', error: 'Local dictionary unavailable.' });
  }
};

export const getLettersSolutions = (req: Request, res: Response) => {
  const drawId = req.params.drawId;
  if (!uuidPattern.test(drawId)) {
    res.status(400).json({ error: 'Invalid drawId.' });
    return;
  }
  const round = letterRoundStore.get(drawId);
  if (!round) {
    res.status(404).json({ code: 'round_missing', error: 'Draw not found or expired.' });
    return;
  }
  if (!letterRoundStore.isFinished(round)) {
    res.status(409).json({ code: 'round_active', error: 'Solutions are hidden while the round is active.' });
    return;
  }
  try {
    res.json({
      language: round.language, score: round.answer?.score ?? 0,
      ...solveLetters(round.language, round.letters)
    });
  } catch (error) {
    console.error('Local dictionary error', error);
    res.status(503).json({ code: 'lexicon_unavailable', error: 'Local dictionary unavailable.' });
  }
};

export const getDuel = (_req: Request, res: Response) => {
  res.json({ type: 'traditional', challenge: 'RAAUBITIAH', answer: 'ARUBA HAITI' });
};
export const getFinalWords = (_req: Request, res: Response) => {
  res.json({ wordSets: [['T', 'O', 'C', 'E', 'D', 'A', 'M', 'I', 'T', 'Q']] });
};
