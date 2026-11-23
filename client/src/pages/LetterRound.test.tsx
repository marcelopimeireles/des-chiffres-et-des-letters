import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LetterRound from './LetterRound';
import { fetchLettersDraw, validateLettersWord } from '../services/gameService';

jest.mock('../services/gameService', () => ({
  fetchLettersDraw: jest.fn(),
  validateLettersWord: jest.fn()
}));

const mockedDraw = fetchLettersDraw as jest.MockedFunction<typeof fetchLettersDraw>;
const mockedValidate = validateLettersWord as jest.MockedFunction<typeof validateLettersWord>;

beforeEach(() => {
  mockedDraw.mockReset();
  mockedValidate.mockReset();
});

test('language selection is sent to the server and locked once drawing starts', async () => {
  mockedDraw.mockResolvedValue({
    drawId: 'example-uuid', language: 'pt',
    letters: ['A','B','C','D','E','F','G','H','I','J'],
    choices: Array(10).fill('vowel'), deadlineAt: Date.now() + 32300,
    revealDurationMs: 2300, playSeconds: 30
  });
  render(<MemoryRouter><LetterRound /></MemoryRouter>);
  const selector = screen.getByRole('combobox', { name: 'Langue du dictionnaire' });
  fireEvent.change(selector, { target: { value: 'pt' } });
  expect(selector).toHaveValue('pt');
  const vowel = screen.getByRole('button', { name: 'Voyelle' });
  const launch = screen.getByRole('button', { name: 'Lancer le tirage' });
  expect(launch).toBeDisabled();
  for (let i = 0; i < 10; i++) fireEvent.click(vowel);
  expect(vowel).toBeDisabled();
  fireEvent.click(launch);
  await waitFor(() => expect(mockedDraw).toHaveBeenCalledWith(Array(10).fill('vowel'), 'pt'));
  expect(selector).toBeDisabled();
});

test('the player can undo the last choice', () => {
  render(<MemoryRouter><LetterRound /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Voyelle' }));
  expect(screen.getByText('1 / 10 choix')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler un choix' }));
  expect(screen.getByText('0 / 10 choix')).toBeInTheDocument();
});

test('a valid English word is only accepted after server dictionary validation', async () => {
  jest.useFakeTimers();
  try {
    mockedDraw.mockResolvedValue({
      drawId: 'example-uuid', language: 'en',
      letters: ['C','A','T','E','R','S','O','N','L','I'],
      choices: Array(10).fill('consonant'), deadlineAt: Date.now() + 32300,
      revealDurationMs: 2300, playSeconds: 30
    });
    mockedValidate.mockResolvedValue({
      valid: true, reason: 'accepted', language: 'en', word: 'cat', score: 3,
      source: 'local-lexicon', solutions: { bestLength: 7, bestWords: ['certain'], lexiconEntries: 4867 }
    });
    render(<MemoryRouter><LetterRound /></MemoryRouter>);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tirage automatique (5 V / 5 C)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lancer le tirage' }));
    await act(async () => { await Promise.resolve(); });
    for (let i = 0; i < 10; i++) {
      await act(async () => { jest.advanceTimersByTime(240); });
    }
    const answer = screen.getByRole('textbox', { name: 'Votre mot en English' });
    fireEvent.change(answer, { target: { value: 'cat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    await act(async () => { await Promise.resolve(); });
    expect(mockedValidate).toHaveBeenCalledWith('example-uuid', 'cat');
    expect(screen.getByText(/Mot reconnu dans le lexique local/)).toBeInTheDocument();
    expect(screen.getByText('3 points')).toBeInTheDocument();
    expect(screen.getByText('certain')).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});
