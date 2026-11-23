import { Request, Response } from 'express';
import { isWordLanguage } from '../domain/letters';
import { soloMatchStore } from '../domain/matches';
import { getLexicon } from '../services/dictionary';

const uuidPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export const createSoloMatch = (req: Request, res: Response) => {
  const language: unknown = req.body?.language ?? 'fr';
  const largeCount: unknown = req.body?.largeCount ?? 2;
  if (!isWordLanguage(language) || typeof largeCount !== 'number' ||
      !Number.isInteger(largeCount) || largeCount < 0 || largeCount > 4) {
    res.status(400).json({
      code: 'invalid_match_config',
      error: 'Expected language en/pt/fr and integer largeCount between 0 and 4.'
    });
    return;
  }
  try {
    getLexicon(language);
    res.status(201).json(soloMatchStore.create({ language, largeCount }));
  } catch (error) {
    console.error('Unable to create solo match', error);
    res.status(503).json({ code: 'match_unavailable', error: 'Unable to initialize solo match.' });
  }
};

export const getSoloMatch = (req: Request, res: Response) => {
  const { matchId } = req.params;
  if (!uuidPattern.test(matchId)) {
    res.status(400).json({ code: 'invalid_match_id', error: 'Invalid match id.' });
    return;
  }
  const match = soloMatchStore.get(matchId);
  if (!match) {
    res.status(404).json({ code: 'match_missing', error: 'Match not found or expired.' });
    return;
  }
  res.json(match);
};

export const nextSoloRound = (req: Request, res: Response) => {
  const { matchId } = req.params;
  if (!uuidPattern.test(matchId)) {
    res.status(400).json({ code: 'invalid_match_id', error: 'Invalid match id.' });
    return;
  }
  const result = soloMatchStore.next(matchId);
  if (result === 'missing') {
    res.status(404).json({ code: 'match_missing', error: 'Match not found or expired.' });
  } else if (result === 'active') {
    res.status(409).json({ code: 'round_active', error: 'Finish the current round first.' });
  } else {
    res.json(result);
  }
};
