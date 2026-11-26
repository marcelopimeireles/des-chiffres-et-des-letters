import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SoloMatch from './SoloMatch';
import { UiLanguageContext } from '../i18n';
import {
  createSoloMatch, fetchSoloMatch, nextSoloRound, validateLettersWord,
  fetchLettersSolutions, fetchNumbersSolutions, SoloMatch as MatchData,
  validateDuelAnswer, skipFinaleWord, fetchDuelSolution, fetchFinaleSolutions
} from '../services/gameService';

jest.mock('../services/gameService', () => ({
  createSoloMatch: jest.fn(),
  fetchSoloMatch: jest.fn(),
  nextSoloRound: jest.fn(),
  validateLettersWord: jest.fn(),
  validateNumbersAnswer: jest.fn(),
  fetchLettersSolutions: jest.fn(),
  fetchNumbersSolutions: jest.fn(),
  validateDuelAnswer: jest.fn(), validateFinaleWord: jest.fn(), skipFinaleWord: jest.fn(),
  fetchDuelSolution: jest.fn(), fetchFinaleSolutions: jest.fn()
}));

const create = createSoloMatch as jest.MockedFunction<typeof createSoloMatch>;
const fetchMatch = fetchSoloMatch as jest.MockedFunction<typeof fetchSoloMatch>;
const next = nextSoloRound as jest.MockedFunction<typeof nextSoloRound>;
const validate = validateLettersWord as jest.MockedFunction<typeof validateLettersWord>;
const letterSolutions = fetchLettersSolutions as jest.MockedFunction<typeof fetchLettersSolutions>;
const numberSolutions = fetchNumbersSolutions as jest.MockedFunction<typeof fetchNumbersSolutions>;
const duelValidate = validateDuelAnswer as jest.MockedFunction<typeof validateDuelAnswer>;
const finalSkip = skipFinaleWord as jest.MockedFunction<typeof skipFinaleWord>;
const duelSolution = fetchDuelSolution as jest.MockedFunction<typeof fetchDuelSolution>;
const finalSolutions = fetchFinaleSolutions as jest.MockedFunction<typeof fetchFinaleSolutions>;

const playing: MatchData = {
  matchId: 'match-test', language: 'fr', largeCount: 2,
  totalRounds: 9, currentIndex: 0, status: 'playing', totalScore: 0,
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
  duelValidate.mockReset();
  finalSkip.mockReset();
  duelSolution.mockReset();
  finalSolutions.mockReset();
  duelSolution.mockResolvedValue({answer:'15',score:8});
  create.mockResolvedValue(playing);
  fetchMatch.mockResolvedValue(review);
  letterSolutions.mockResolvedValue({bestLength: 5, bestWords: ['carte'], lexiconEntries: 11000});
});

test('creates a nine-stage solo game and persists match ID', async () => {
  create.mockResolvedValue({...playing, language: 'pt'});
  render(<UiLanguageContext.Provider value="pt"><MemoryRouter><SoloMatch /></MemoryRouter></UiLanguageContext.Provider>);
  await screen.findByText('Nova partida');
  expect(screen.queryByRole('combobox', { name: 'Idioma' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith('pt', 2));
  await waitFor(() => expect(window.localStorage.getItem('des-chiffres-et-des-lettres:solo-match')).toBe('match-test'));
  expect(await screen.findByRole('textbox', { name: 'A sua palavra' })).toBeInTheDocument();
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
    ...review, currentIndex: 9, status: 'finished', current: null,
    history: [
      ...review.history,
      ...[1,2,3,4,5,6,7,8].map(index => ({
        kind: (index < 6 ? (index % 2 ? 'numbers' : 'letters') : index < 8 ? 'duel' : 'final') as 'numbers' | 'letters' | 'duel' | 'final',
        index, drawId: String(index), score: 0, answer: null
      }))
    ]
  };
  window.localStorage.setItem('des-chiffres-et-des-lettres:solo-match', 'match-test');
  fetchMatch.mockResolvedValue(done);
  render(<MemoryRouter><SoloMatch /></MemoryRouter>);
  expect(await screen.findByText('Votre résultat final')).toBeInTheDocument();
  expect(screen.getAllByText('3 points').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'Nouvelle partie' }));
  expect(window.localStorage.getItem('des-chiffres-et-des-lettres:solo-match')).toBeNull();
  expect(screen.getByText('Nouvelle partie')).toBeInTheDocument();
});

test('recovered mental duel contributes only server-scored points', async () => {
  const duel: MatchData = {
    ...playing, currentIndex: 7, totalRounds: 9, status: 'playing',
    current: {
      kind: 'duel', index: 7, drawId: 'duel-test',
      duelKind: 'mental', challenge: '12 + 3 = ?', deadlineAt: Date.now() + 30000
    }
  };
  const reviewed: MatchData = {
    ...duel, status: 'review', totalScore: 8,
    history: [{kind:'duel', index:7, drawId:'duel-test', answer:'15', score:8}]
  };
  window.localStorage.setItem('des-chiffres-et-des-lettres:solo-match','match-test');
  fetchMatch.mockResolvedValueOnce(duel).mockResolvedValueOnce(reviewed);
  duelValidate.mockResolvedValue({valid:true,reason:'accepted',score:8});
  render(<MemoryRouter><SoloMatch /></MemoryRouter>);
  expect(await screen.findByText('12 + 3 = ?')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{name:'Votre résultat'}),{target:{value:'15'}});
  fireEvent.click(screen.getByRole('button',{name:'Valider'}));
  await waitFor(() => expect(duelValidate).toHaveBeenCalledWith('duel-test','15'));
  expect(await screen.findByText('Ronde terminée')).toBeInTheDocument();
  expect(await screen.findByText(/Réponse attendue/)).toBeInTheDocument();
});

test('finale can skip a word and updates progression from server', async () => {
  const final: MatchData = {
    ...playing, currentIndex: 8, totalRounds: 9, status: 'playing',
    current: {
      kind: 'final', index: 8, drawId: 'final-test',
      deadlineAt: Date.now() + 120000,
      finaleIndex: 0, finaleTotal: 8, finaleScore: 0,
      letters: ['A','B','C','D','E','F','G','H','I','J']
    }
  };
  const advanced: MatchData = {
    ...final,
    current: {
      ...final.current!, finaleIndex: 1,
      letters: ['A','A','B','B','C','C','D','D','E','E']
    }
  };
  window.localStorage.setItem('des-chiffres-et-des-lettres:solo-match','match-test');
  fetchMatch.mockResolvedValueOnce(final).mockResolvedValueOnce(advanced);
  finalSkip.mockResolvedValue({
    drawId: 'final-test', language: 'fr', deadlineAt: Date.now() + 120000,
    totalItems: 8, currentIndex: 1, score: 0, finished: false,
    current: {index:1,letters:['A','A','B','B','C','C','D','D','E','E']}
  });
  render(<MemoryRouter><SoloMatch /></MemoryRouter>);
  expect(await screen.findByText('MOT 1 / 8')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Passer ce mot'}));
  await waitFor(() => expect(finalSkip).toHaveBeenCalledWith('final-test',0));
  expect(await screen.findByText('MOT 2 / 8')).toBeInTheDocument();
});
