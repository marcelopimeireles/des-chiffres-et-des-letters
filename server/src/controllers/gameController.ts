import { Request, Response } from 'express';
import { drawLetters, isLetterChoices, LetterKind, shuffle } from '../domain/letters';

// Traditional pool: two of each small number and one of each large plate.
const numberPool = [25, 50, 75, 100,
  ...Array.from({ length: 10 }, (_, i) => i + 1),
  ...Array.from({ length: 10 }, (_, i) => i + 1)
];

export const getNumbersGame = (_req: Request, res: Response) => {
  const targetNumber = Math.floor(Math.random() * 899) + 101;
  const numbers = shuffle(numberPool).slice(0, 6);
  res.json({ targetNumber, numbers });
};

export const getLettersGame = (_req: Request, res: Response) => {
  // Backward-compatible endpoint. New rounds use POST /letters/draw.
  const types: LetterKind[] = shuffle([
    ...Array<LetterKind>(5).fill('vowel'),
    ...Array<LetterKind>(5).fill('consonant')
  ]);
  res.json({ letters: drawLetters(types) });
};

export const createLettersDraw = (req: Request, res: Response) => {
  const choices: unknown = req.body?.choices;
  if (!isLetterChoices(choices)) {
    res.status(400).json({
      error: 'choices must contain exactly 10 entries: vowel or consonant'
    });
    return;
  }
  const letters = drawLetters(choices);
  res.json({ letters, choices });
};

export const getDuel = (_req: Request, res: Response) => {
  const type = 'traditional';
  const challenge = 'RAAUBITIAH';
  const answer = 'ARUBA HAITI';
  res.json({ type, challenge, answer });
};

export const getFinalWords = (_req: Request, res: Response) => {
  const wordSets = [['T', 'O', 'C', 'E', 'D', 'A', 'M', 'I', 'T', 'Q']];
  res.json({ wordSets });
};
