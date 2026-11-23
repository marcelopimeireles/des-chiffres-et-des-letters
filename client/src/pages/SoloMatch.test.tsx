import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SoloMatch from './SoloMatch';
import {
  createSoloMatch, fetchSoloMatch, nextSoloRound, validateLettersWord,
  fetchLettersSolutions, fetchNumbersSolutions, SoloMatch as MatchData
} from '../services/gameService';

jest.mock('../services/gameService', () => ({
  createSoloMatch: jest.fn(),
  fetchSoloMatch: jest.fn(),
  nextSoloRound: jest.fn(),
  validateLettersWord: jest.fn(),
  validateNumbersAnswer: jest.fn(),
  fetchLettersSolutions: jest.fn(),
  fetchNumbersSolutions: jest.fn()
}));

const create = createSoloMatch as jest.MockedFunction<typeof createSoloMatch>;
const fetchMatch = fetchSoloMatch as jest.MockedFunction<typeof fetchSoloMatch>;
const next = nextSoloRound as jest.MockedFunction<typeof nextSoloRound>;
const validate = validateLettersWord as jest.MockedFunction<typeof validateLettersWord>;
const letterSolutions = fetchLettersSolutions as jest.MockedFunction<typeof fetchLettersSolutions>;
const numberSolutions = fetchNumbersSolutions as jest.MockedFunction<typeof fetchNumbersSolutions>;

const playing: MatchData = {
  matchId: 'match-test', language: 'fr', largeCount: 2,
  totalRounds: 6, currentIndex: 0, status: 'playing', totalScore: 0,
  history: [],
  current: {
    kind: 'letters', index: 0, drawId: 'letters-round',
    deadlineAt: Date.now() + 34000,
    letters: ['C','A','T','E','R','S','O','N','L','I']
  }
};

const review: MatchData = {
  ...playing, status: 'review', totalScore: 3,
  history: [{
    kind: 'letters', index: 0, drawId: 'letters-round',
    score: 3, answer: 'cat'
  }]
};

beforeEach(() => {
  window.localStorage.clear();
  create.mockReset();
  fetchMatch.mockReset();
  next.mockReset();
  validate.mockReset();
  letterSolutions.mockReset();
  numberSolutions.mockReset();
  create.mockResolvedValue(playing);
  fetchMatch.mockResolvedValue(review);
  letterSolutions.mockResolvedValue({bestLength: 5, bestWords: ['carte'], lexiconEntries: 11000});
});

test('creates a six-round solo game and persists match ID', async () => {
  render(<MemoryRouter><SoloMatch /></MemoryRouter>);
  await screen.findByText('Nouvelle partie');
  fireEvent.change(screen.getByRole('combobox', { name: 'Langue des lettres' }), {
    target: { value: 'pt' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la partie' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith('pt', 2));
  expect(window.localStorage.getItem('des-chiffres-et-des-lettres:solo-match')).toBe('match-test');
  expect(screen.getByRole('textbox', { name: 'Votre mot' })).toBeInTheDocument();
});

test('only the server supplies cumulative scores, then the next round starts', async () => {
  validate.mockResolvedValue({ valid: true, reason: 'accepted', language: 'fr', word: 'cat', score: 3 });
  next.mockResolvedValue({
    ...review, currentIndex: 1, status: 'playing',
    current: {
      kind: 'numbers', index: 1, drawId: 'numbers-round',
      numbers: [10,5,8,3,2,1], targetNumber: 117,
      deadlineAt: Date.now() + 45000
    }
  });
  render(<MemoryRouter><SoloMatch /></MemoryRouter>);
  await screen.findByText('Nouvelle partie');
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la partie' }));
  const input = await screen.findByRole('textbox', { name: 'Votre mot' });
  fireEvent.change(input, { target: { value: 'cat' } });
  fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
  await waitFor(() => expect(validate).toHaveBeenCalledWith('letters-round', 'cat'));
  expect(await screen.findByText('Ronde terminée')).toBeInTheDocument();
  expect(screen.getAllByText('3 points').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'Épreuve suivante' }));
  await waitFor(() => expect(next).toHaveBeenCalledWith('match-test'));
  expect(await screen.findByText('117')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Votre calcul' })).toBeInTheDocument();
});

test('restores saved server match on page reload', async () => {
  window.localStorage.setItem('des-chiffres-et-des-lettres:solo-match', 'match-test');
  fetchMatch.mockResolvedValue(playing);
  render(<MemoryRouter><SoloMatch /></MemoryRouter>);
  await waitFor(() => expect(fetchMatch).toHaveBeenCalledWith('match-test'));
  expect(await screen.findByRole('textbox', { name: 'Votre mot' })).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
});

test('finished match shows server score and new match option', async () => {
  const done: MatchData = {
    ...review, currentIndex: 6, status: 'finished', current: null,
    history: [
      ...review.history,
      ...[1,2,3,4,5].map(index => ({
        kind: (index % 2 ? 'numbers' : 'letters') as 'numbers' | 'letters',
        index, drawId: String(index), score: 0, answer: null
      }))
    ]
  };
  window.localStorage.setItem('des-chiffres-et-des-lettres:solo-match', 'match-test');
  fetchMatch.mockResolvedValue(done);
  render(<MemoryRouter><SoloMatch /></MemoryRouter>);
  expect(await screen.findByText('Votre résultat final')).toBeInTheDocument();
  expect(screen.getByText('3 points')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Nouvelle partie' }));
  expect(window.localStorage.getItem('des-chiffres-et-des-lettres:solo-match')).toBeNull();
  expect(screen.getByText('Nouvelle partie')).toBeInTheDocument();
});
