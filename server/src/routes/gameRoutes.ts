import { Router } from 'express';
import {
  createLettersDraw, validateLettersWord, getLettersSolutions,
  getNumbersGame, getLettersGame, getDuel, getFinalWords
} from '../controllers/gameController';

const router = Router();
router.get('/numbers', getNumbersGame);
router.get('/letters', getLettersGame);
router.post('/letters/draw', createLettersDraw);
router.post('/letters/validate', validateLettersWord);
router.get('/letters/:drawId/solutions', getLettersSolutions);
router.get('/duel', getDuel);
router.get('/final', getFinalWords);
export default router;
