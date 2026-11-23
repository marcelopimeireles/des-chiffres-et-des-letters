import { Request, Response } from 'express';

// Traditional pool: two of each small number and one of each large plate.
const numberPool = [25, 50, 75, 100,
  ...Array.from({ length: 10 }, (_, i) => i + 1),
  ...Array.from({ length: 10 }, (_, i) => i + 1)
];

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const getNumbersGame = (_req: Request, res: Response) => {
  const targetNumber = Math.floor(Math.random() * 899) + 101;
  const numbers = shuffle(numberPool).slice(0, 6);
  res.json({ targetNumber, numbers });
};

export const getLettersGame = (_req: Request, res: Response) => {
  // Balanced first version; choosing vowels/consonants is future work.
  const vowels = 'AAAAAAAEEEEEEEEIIIIIOOOOOUUU';
  const consonants = 'BBCCDDFFGGHHJJKKLLMMNNPPQRRRSSSSTTTVVWWXXYYZZ';
  const letters = [
    ...Array.from({ length: 5 }, () => vowels[Math.floor(Math.random() * vowels.length)]),
    ...Array.from({ length: 5 }, () => consonants[Math.floor(Math.random() * consonants.length)])
  ];
  res.json({ letters: shuffle(letters) });
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
