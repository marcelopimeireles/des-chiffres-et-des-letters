import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LetterRound from './LetterRound';
import { fetchLettersDraw } from '../services/gameService';

jest.mock('../services/gameService', () => ({
  fetchLettersDraw: jest.fn()
}));

const mockedDraw = fetchLettersDraw as jest.MockedFunction<typeof fetchLettersDraw>;

beforeEach(() => {
  mockedDraw.mockReset();
});

test('the player chooses exactly ten letter kinds before calling the draw API', async () => {
  mockedDraw.mockResolvedValue({
    letters: ['A','B','C','D','E','F','G','H','I','J'],
    choices: Array(10).fill('vowel')
  });
  render(<MemoryRouter><LetterRound /></MemoryRouter>);
  const vowel = screen.getByRole('button', { name: 'Voyelle' });
  const launch = screen.getByRole('button', { name: 'Lancer le tirage' });
  expect(launch).toBeDisabled();
  for (let i = 0; i < 10; i += 1) fireEvent.click(vowel);
  expect(vowel).toBeDisabled();
  expect(launch).toBeEnabled();
  fireEvent.click(launch);
  await waitFor(() => expect(mockedDraw).toHaveBeenCalledTimes(1));
  expect(mockedDraw).toHaveBeenCalledWith(Array(10).fill('vowel'));
});

test('the player can undo the last choice', () => {
  render(<MemoryRouter><LetterRound /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Voyelle' }));
  expect(screen.getByText('1 / 10 choix')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler un choix' }));
  expect(screen.getByText('0 / 10 choix')).toBeInTheDocument();
});
