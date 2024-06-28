import { Router } from 'express';
import { getNumbersGame, getLettersGame, getDuel, getFinalWords } from '../controllers/gameController';

const router = Router();

/**
 * @swagger
 * /numbers:
 *   get:
 *     summary: Retrieve a numbers game challenge
 *     responses:
 *       200:
 *         description: A numbers game challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                 answer:
 *                   type: number
 */
router.get('/numbers', getNumbersGame);

/**
 * @swagger
 * /letters:
 *   get:
 *     summary: Retrieve a letters game challenge
 *     responses:
 *       200:
 *         description: A letters game challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                 answer:
 *                   type: string
 */
router.get('/letters', getLettersGame);

/**
 * @swagger
 * /duel:
 *   get:
 *     summary: Retrieve a duel challenge
 *     responses:
 *       200:
 *         description: A duel challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                 answer:
 *                   type: string
 */
router.get('/duel', getDuel);

/**
 * @swagger
 * /final:
 *   get:
 *     summary: Retrieve the final words challenge
 *     responses:
 *       200:
 *         description: The final words challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                 answer:
 *                   type: string
 */
router.get('/final', getFinalWords);

export default router;