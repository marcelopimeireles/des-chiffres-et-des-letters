import { createSlice } from '@reduxjs/toolkit';

interface GameState {
  numberRound: { targetNumber: number, numbers: number[] };
  letterRound: { letters: string[] };
  duel: { type: string, challenge: string, answer: string };
  finalWords: { wordSets: string[][] };
}

const initialState: GameState = {
  numberRound: { targetNumber: 0, numbers: [] },
  letterRound: { letters: [] },
  duel: { type: '', challenge: '', answer: '' },
  finalWords: { wordSets: [] },
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setNumberRound: (state, action) => {
      state.numberRound = action.payload;
    },
    setLetterRound: (state, action) => {
      state.letterRound = action.payload;
    },
    setDuel: (state, action) => {
      state.duel = action.payload;
    },
    setFinalWords: (state, action) => {
      state.finalWords = action.payload;
    },
  },
});

export const { setNumberRound, setLetterRound, setDuel, setFinalWords } = gameSlice.actions;
export default gameSlice.reducer;
