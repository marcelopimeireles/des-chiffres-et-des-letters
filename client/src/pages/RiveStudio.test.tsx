import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RiveStudio from './RiveStudio';
import { fetchLettersDraw, validateLettersWord } from '../services/gameService';

jest.mock('../services/gameService', () => ({
  fetchLettersDraw: jest.fn(),
  validateLettersWord: jest.fn()
}));

jest.mock('../components/RiveGameBoard', () => ({
  __esModule: true,
  default: ({ text, tiles, onAction, onKey }: React.ComponentProps<typeof import('../components/RiveGameBoard').default>) => (
    <div>
      <h1>{text.heading}</h1>
      <p>{text.score}</p>
      <p>{tiles.join('')}</p>
      <button onClick={() => onAction('primary')}>{text.primaryLabel}</button>
      <button onClick={() => onAction('secondary')}>{text.secondaryLabel}</button>
      <button onClick={() => onAction('reset')}>{text.resetLabel}</button>
      <button onClick={() => onKey('A')}>Tape A</button>
    </div>
  )
}));

test('routes from the studio menu and validates a word entered through Rive actions', async () => {
  jest.mocked(fetchLettersDraw).mockResolvedValue({
    drawId: 'letters-1',
    letters: ['A', 'B', 'C'],
    choices: [],
    language: 'fr',
    deadlineAt: Date.now() + 30_000,
    revealDurationMs: 0,
    playSeconds: 30
  });
  jest.mocked(validateLettersWord).mockResolvedValue({
    valid: true, reason: 'accepted', language: 'fr', score: 1
  });

  render(
    <MemoryRouter initialEntries={['/rive']}>
      <Routes><Route path="/rive/*" element={<RiveStudio />} /></Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Les lettres' }));
  expect(screen.getByRole('heading', { name: 'Le mot le plus long' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tirer' }));
  expect(await screen.findByText('ABC')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tape A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
  expect(await screen.findByText('1 points')).toBeInTheDocument();
  expect(validateLettersWord).toHaveBeenCalledWith('letters-1', 'A');

  fireEvent.click(screen.getByRole('button', { name: 'Quitter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  expect(screen.getByRole('heading', { name: 'Des chiffres et des lettres' })).toBeInTheDocument();
});
