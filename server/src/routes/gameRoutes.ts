import { Router } from 'express';
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
router.get('/duel', getDuel);
router.get('/final', getFinalWords);
export default router;
