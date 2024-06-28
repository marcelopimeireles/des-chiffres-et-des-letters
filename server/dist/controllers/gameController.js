"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinalWords = exports.getDuel = exports.getLettersGame = exports.getNumbersGame = void 0;
const getNumbersGame = (req, res) => {
    const targetNumber = Math.floor(Math.random() * 900) + 100;
    const numbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10) + 1);
    res.json({ targetNumber, numbers });
};
exports.getNumbersGame = getNumbersGame;
const getLettersGame = (req, res) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const selectedLetters = Array.from({ length: 10 }, () => letters.charAt(Math.floor(Math.random() * letters.length)));
    res.json({ letters: selectedLetters });
};
exports.getLettersGame = getLettersGame;
const getDuel = (req, res) => {
    const type = 'traditional';
    const challenge = 'RAAUBITIAH';
    const answer = 'ARUBA HAITI';
    res.json({ type, challenge, answer });
};
exports.getDuel = getDuel;
const getFinalWords = (req, res) => {
    const wordSets = [['T', 'O', 'C', 'E', 'D', 'A', 'M', 'I', 'T', 'Q']];
    res.json({ wordSets });
};
exports.getFinalWords = getFinalWords;
