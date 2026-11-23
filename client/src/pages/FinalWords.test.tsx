import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinalWords from './FinalWords';
import {
  createFinaleDraw, fetchFinaleDraw, fetchFinaleSolutions,
  skipFinaleWord, validateFinaleWord
} from '../services/gameService';

jest.mock('../services/gameService', () => ({
  createFinaleDraw: jest.fn(), fetchFinaleDraw: jest.fn(),
  fetchFinaleSolutions: jest.fn(), skipFinaleWord: jest.fn(), validateFinaleWord: jest.fn()
}));
const create = createFinaleDraw as jest.MockedFunction<typeof createFinaleDraw>;
const skip = skipFinaleWord as jest.MockedFunction<typeof skipFinaleWord>;
const validate = validateFinaleWord as jest.MockedFunction<typeof validateFinaleWord>;
const solutions = fetchFinaleSolutions as jest.MockedFunction<typeof fetchFinaleSolutions>;
const mockRound = {
  drawId:'id', language:'en' as const, deadlineAt: Date.now()+120000,
  totalItems:8, currentIndex:0, score:0, finished:false,
  current:{index:0,letters:['A','B','C','D','E','F','G','H','I','J']}
};
beforeEach(() => {
  create.mockReset(); skip.mockReset(); validate.mockReset(); solutions.mockReset();
  (fetchFinaleDraw as jest.Mock).mockReset();
  create.mockResolvedValue(mockRound);
});

test('eight-word finale allows validation and moving to next anagram', async () => {
  validate.mockResolvedValue({
    valid:true, reason:'accepted', score:10, currentIndex:1, finished:false,
    round:{...mockRound,currentIndex:1,score:10,current:{index:1,letters:['A','A','B','B','C','C','D','D','E','E']}}
  });
  render(<MemoryRouter><FinalWords /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Commencer la finale'}));
  expect(await screen.findByText('TIRAGE 1 / 8')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{name:'Votre mot de dix lettres'}),{target:{value:'abcdefghij'}});
  fireEvent.click(screen.getByRole('button',{name:'Valider'}));
  await waitFor(() => expect(validate).toHaveBeenCalledWith('id',0,'abcdefghij'));
  expect(await screen.findByText('TIRAGE 2 / 8')).toBeInTheDocument();
  expect(screen.getByText('Mot accepté : 10 points.')).toBeInTheDocument();
});

test('finale supports passing a word without points', async () => {
  skip.mockResolvedValue({
    ...mockRound,currentIndex:1,
    current:{index:1,letters:['A','A','B','B','C','C','D','D','E','E']}
  });
  render(<MemoryRouter><FinalWords /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Commencer la finale'}));
  await screen.findByText('TIRAGE 1 / 8');
  fireEvent.click(screen.getByRole('button',{name:'Passer ce mot'}));
  await waitFor(() => expect(skip).toHaveBeenCalledWith('id',0));
  expect(await screen.findByText('TIRAGE 2 / 8')).toBeInTheDocument();
});
