import { Request, Response } from 'express';

export const getNumbersGame = (req: Request, res: Response) => {
  const targetNumber = Math.floor(Math.random() * 900) + 100;
  const numbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10) + 1);
  res.json({ targetNumber, numbers });
};

export const getLettersGame = (req: Request, res: Response) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const selectedLetters = Array.from({ length: 10 }, () => letters.charAt(Math.floor(Math.random() * letters.length)));
  res.json({ letters: selectedLetters });
};

export const getDuel = (req: Request, res: Response) => {
  const type = 'traditional';
  const challenge = 'RAAUBITIAH';
  const answer = 'ARUBA HAITI';
  res.json({ type, challenge, answer });
};

export const getFinalWords = (req: Request, res: Response) => {
  const wordSets = [['T', 'O', 'C', 'E', 'D', 'A', 'M', 'I', 'T', 'Q']];
  res.json({ wordSets });
};
