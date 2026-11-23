import { Router } from 'express';
import {
  createLettersDraw, getNumbersGame, getLettersGame, getDuel, getFinalWords
} from '../controllers/gameController';

const router = Router();

router.get('/numbers', getNumbersGame);
router.get('/letters', getLettersGame);
/** Draw 10 letters following the vowel/consonant choices selected by the player. */
router.post('/letters/draw', createLettersDraw);
router.get('/duel', getDuel);
router.get('/final', getFinalWords);

export default router;
