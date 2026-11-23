import { Request, Response } from 'express';
import { duelRoundStore, DuelKind, DuelRound } from '../domain/duels';
import { finaleRoundStore, FinaleRound } from '../domain/finale';
import { isWordLanguage } from '../domain/letters';
import { soloMatchStore } from '../domain/matches';

const uuidPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const validId = (req: Request, res: Response): string | null => {
  const id = req.params.drawId || req.body?.drawId;
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    res.status(400).json({ code: 'invalid_draw_id', error: 'Invalid drawId.' });
    return null;
  }
  return id;
};

function duelView(round: DuelRound) {
  return {
    drawId: round.drawId, kind: round.kind, language: round.language,
    deadlineAt: round.deadlineAt, challenge: round.challenge,
    letters: round.letters, operands: round.operands, operator: round.operator,
    finished: duelRoundStore.isFinished(round), score: round.score
  };
}
function finaleView(round: FinaleRound) {
  return {
    drawId: round.drawId, language: round.language,
    deadlineAt: round.deadlineAt,
    totalItems: round.items.length, currentIndex: round.currentIndex,
    score: round.score, finished: finaleRoundStore.isFinished(round),
    current: finaleRoundStore.current(round)
  };
}

export const createDuelDraw = (req: Request, res: Response) => {
  const { kind, language = 'fr' } = req.body || {};
  if ((kind !== 'anagram' && kind !== 'mental') || !isWordLanguage(language)) {
    res.status(400).json({ code: 'invalid_duel', error: 'Expected kind anagram or mental, and language en/pt/fr.' });
    return;
  }
  try {
    res.status(201).json(duelView(duelRoundStore.create(kind as DuelKind, language)));
  } catch (error) {
    console.error('Unable to create duel', error);
    res.status(503).json({ code: 'duel_unavailable', error: 'Duel unavailable.' });
  }
};

export const getDuelDraw = (req: Request, res: Response) => {
  const id = validId(req, res); if (!id) return;
  const round = duelRoundStore.get(id);
  if (!round) { res.status(404).json({ code: 'round_missing' }); return; }
  res.json(duelView(round));
};

export const validateDuel = (req: Request, res: Response) => {
  const id = validId(req, res); if (!id) return;
  const round = duelRoundStore.get(id);
  if (!round) { res.status(404).json({ code: 'round_missing' }); return; }
  if (duelRoundStore.isFinished(round)) {
    res.status(409).json({ code: 'duel_finished' }); return;
  }
  const { answer } = req.body || {};
  const attempt = duelRoundStore.submit(round, answer);
  if (attempt.valid) soloMatchStore.markResolved(round.drawId);
  res.json(attempt);
};

export const getDuelSolution = (req: Request, res: Response) => {
  const id = validId(req, res); if (!id) return;
  const round = duelRoundStore.get(id);
  if (!round) { res.status(404).json({ code: 'round_missing' }); return; }
  const result = duelRoundStore.reveal(round);
  if (!result) { res.status(409).json({ code: 'round_active' }); return; }
  res.json(result);
};

export const createFinale = (req: Request, res: Response) => {
  const { language = 'fr' } = req.body || {};
  if (!isWordLanguage(language)) {
    res.status(400).json({ code: 'invalid_language' }); return;
  }
  try {
    res.status(201).json(finaleView(finaleRoundStore.create(language)));
  } catch (error) {
    console.error('Unable to create finale', error);
    res.status(503).json({ code: 'finale_unavailable' }); 
  }
};

export const getFinale = (req: Request, res: Response) => {
  const id = validId(req, res); if (!id) return;
  const round = finaleRoundStore.get(id);
  if (!round) { res.status(404).json({ code: 'round_missing' }); return; }
  res.json(finaleView(round));
};

export const validateFinale = (req: Request, res: Response) => {
  const id = validId(req, res); if (!id) return;
  const round = finaleRoundStore.get(id);
  if (!round) { res.status(404).json({ code: 'round_missing' }); return; }
  if (finaleRoundStore.isFinished(round)) {
    res.status(409).json({ code: 'finale_finished' }); return;
  }
  const { index, word } = req.body || {};
  if (!Number.isInteger(index) || index !== round.currentIndex) {
    res.status(409).json({ code: 'finale_out_of_sequence' }); return;
  }
  const result = finaleRoundStore.submit(round, index, word);
  if (result.finished) soloMatchStore.markResolved(round.drawId);
  res.json({ ...result, round: finaleView(round) });
};

export const skipFinale = (req: Request, res: Response) => {
  const id = validId(req, res); if (!id) return;
  const round = finaleRoundStore.get(id);
  if (!round) { res.status(404).json({ code: 'round_missing' }); return; }
  if (finaleRoundStore.isFinished(round)) {
    res.status(409).json({ code: 'finale_finished' }); return;
  }
  const { index } = req.body || {};
  if (!Number.isInteger(index) || index !== round.currentIndex) {
    res.status(409).json({ code: 'finale_out_of_sequence' }); return;
  }
  finaleRoundStore.skip(round, index);
  if (finaleRoundStore.isFinished(round)) soloMatchStore.markResolved(round.drawId);
  res.json(finaleView(round));
};

export const getFinaleSolutions = (req: Request, res: Response) => {
  const id = validId(req, res); if (!id) return;
  const round = finaleRoundStore.get(id);
  if (!round) { res.status(404).json({ code: 'round_missing' }); return; }
  const result = finaleRoundStore.reveal(round);
  if (!result) { res.status(409).json({ code: 'round_active' }); return; }
  res.json(result);
};
