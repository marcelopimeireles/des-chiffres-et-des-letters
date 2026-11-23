import { Router } from 'express';
import {
  createDuelDraw, getDuelDraw, validateDuel, getDuelSolution,
  createFinale, getFinale, validateFinale, skipFinale, getFinaleSolutions
} from '../controllers/challengesController';
import { createSoloMatch, getSoloMatch, nextSoloRound } from '../controllers/matchesController';
import {
  createNumbersDraw, validateNumbersAnswer, getNumbersSolutions
} from '../controllers/numbersController';
import {
  createLettersDraw, validateLettersWord, getLettersSolutions,
  getNumbersGame, getLettersGame, getDuel, getFinalWords
} from '../controllers/gameController';

const router = Router();
router.post('/matches', createSoloMatch);
router.get('/matches/:matchId', getSoloMatch);
router.post('/matches/:matchId/next', nextSoloRound);
router.get('/numbers', getNumbersGame); // backwards-compatible, no match state
router.post('/numbers/draw', createNumbersDraw);
router.post('/numbers/validate', validateNumbersAnswer);
router.get('/numbers/:drawId/solutions', getNumbersSolutions);
router.get('/letters', getLettersGame);
router.post('/letters/draw', createLettersDraw);
router.post('/letters/validate', validateLettersWord);
router.get('/letters/:drawId/solutions', getLettersSolutions);
router.get('/duel', getDuel); // legacy demonstration
router.post('/duels/draw', createDuelDraw);
router.post('/duels/validate', validateDuel);
router.get('/duels/:drawId', getDuelDraw);
router.get('/duels/:drawId/solution', getDuelSolution);
router.get('/final', getFinalWords); // legacy demonstration
router.post('/finale/draw', createFinale);
router.post('/finale/validate', validateFinale);
router.post('/finale/skip', skipFinale);
router.get('/finale/:drawId', getFinale);
router.get('/finale/:drawId/solutions', getFinaleSolutions);
export default router;
