import { Request, Response } from 'express';
import { numberRoundStore, NUMBER_PLAY_SECONDS } from '../domain/numberRounds';
import { soloMatchStore } from '../domain/matches';
import { parseNumbersExpression, scoreNumbers, solveNumbers } from '../domain/numbers';

const uuidPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export const createNumbersDraw = (req: Request, res: Response) => {
  const largeCount: unknown = req.body?.largeCount ?? 2;
  if (typeof largeCount !== 'number' || !Number.isInteger(largeCount) ||
      largeCount < 0 || largeCount > 4) {
    res.status(400).json({ code: 'invalid_large_count', error: 'largeCount must be an integer from 0 to 4.' });
    return;
  }
  const round = numberRoundStore.create(largeCount);
  res.json({
    drawId: round.drawId, targetNumber: round.targetNumber,
    numbers: round.numbers, largeCount: round.largeCount,
    deadlineAt: round.deadlineAt, playSeconds: NUMBER_PLAY_SECONDS
  });
};

export const validateNumbersAnswer = (req: Request, res: Response) => {
  const { drawId, expression } = req.body || {};
  if (typeof drawId !== 'string' || !uuidPattern.test(drawId) ||
      typeof expression !== 'string' || expression.length === 0 || expression.length > 180) {
    res.status(400).json({ code: 'invalid_request', error: 'Expected a drawId and an expression of 1 to 180 characters.' });
    return;
  }
  const round = numberRoundStore.get(drawId);
  if (!round) {
    res.status(404).json({ code: 'round_missing', error: 'Draw not found or expired.' });
    return;
  }
  if (numberRoundStore.isFinished(round)) {
    res.status(409).json({ code: 'round_finished', error: 'Time expired or answer already submitted.' });
    return;
  }
  let result: number;
  try {
    result = parseNumbersExpression(expression, round.numbers);
  } catch (error) {
    res.json({
      valid: false, reason: 'invalid_expression', score: 0,
      error: error instanceof Error ? error.message : 'Expression invalide.'
    });
    return;
  }
  const distance = Math.abs(round.targetNumber - result);
  const score = scoreNumbers(distance);
  if (!numberRoundStore.complete(round, expression, result, score)) {
    res.status(409).json({ code: 'round_finished', error: 'Round already finished.' });
    return;
  }
  soloMatchStore.markResolved(round.drawId);
  try {
    const solution = round.solution ?? solveNumbers(round.numbers, round.targetNumber);
    round.solution = solution;
    res.json({
      valid: true, reason: 'accepted', value: result, distance, score,
      exact: distance === 0, solution
    });
  } catch (error) {
    console.error('Numbers solver error', error);
    // Submitted answer remains scored even if solver fails to produce examples.
    res.json({
      valid: true, reason: 'accepted', value: result, distance, score,
      exact: distance === 0, solution: null
    });
  }
};

export const getNumbersSolutions = (req: Request, res: Response) => {
  const { drawId } = req.params;
  if (!uuidPattern.test(drawId)) {
    res.status(400).json({ code: 'invalid_request', error: 'Invalid drawId.' });
    return;
  }
  const round = numberRoundStore.get(drawId);
  if (!round) {
    res.status(404).json({ code: 'round_missing', error: 'Draw not found or expired.' });
    return;
  }
  if (!numberRoundStore.isFinished(round)) {
    res.status(409).json({ code: 'round_active', error: 'Solutions are hidden while the game is active.' });
    return;
  }
  try {
    if (!round.solution) {
      round.solution = solveNumbers(round.numbers, round.targetNumber);
    }
    res.json({
      targetNumber: round.targetNumber,
      score: round.answer?.score ?? 0,
      submittedValue: round.answer?.value ?? null,
      solution: round.solution
    });
  } catch (error) {
    console.error('Numbers solver error', error);
    res.status(503).json({ code: 'solver_unavailable', error: 'Solution temporarily unavailable.' });
  }
};
