import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Duel from './Duel';
import { createDuelDraw, fetchDuelDraw, fetchDuelSolution, validateDuelAnswer } from '../services/gameService';

vi.mock('../services/gameService', () => ({
  createDuelDraw: vi.fn(), fetchDuelDraw: vi.fn(),
  fetchDuelSolution: vi.fn(), validateDuelAnswer: vi.fn()
}));
const create = createDuelDraw as jest.MockedFunction<typeof createDuelDraw>;
const fetchRound = fetchDuelDraw as jest.MockedFunction<typeof fetchDuelDraw>;
const validate = validateDuelAnswer as jest.MockedFunction<typeof validateDuelAnswer>;
const solution = fetchDuelSolution as jest.MockedFunction<typeof fetchDuelSolution>;

beforeEach(() => {
  create.mockReset(); fetchRound.mockReset(); validate.mockReset(); solution.mockReset();
});

test('playable mental duel is validated by the backend and reveals solution afterward', async () => {
  create.mockResolvedValue({
    drawId: 'id', kind: 'mental', language: 'fr', challenge: '12 + 3 = ?',
    deadlineAt: Date.now() + 30000, finished: false, score: 0
  });
  fetchRound.mockResolvedValue({
    drawId: 'id', kind: 'mental', language: 'fr', challenge: '12 + 3 = ?',
    deadlineAt: Date.now() + 30000, finished: true, score: 8
  });
  validate.mockResolvedValue({valid: true, reason:'accepted', score:8});
  solution.mockResolvedValue({answer:'15',score:8});
  render(<MemoryRouter><Duel /></MemoryRouter>);
  fireEvent.change(screen.getByRole('combobox', {name:'Type de duel'}), {target:{value:'mental'}});
  fireEvent.click(screen.getByRole('button',{name:'Commencer le duel'}));
  expect(await screen.findByText('12 + 3 = ?')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{name:'Votre résultat'}), {target:{value:'15'}});
  fireEvent.click(screen.getByRole('button',{name:'Valider'}));
  await waitFor(() => expect(validate).toHaveBeenCalledWith('id','15'));
  expect(await screen.findByText('Duel terminé')).toBeInTheDocument();
  expect(await screen.findByText(/Réponse attendue/)).toBeInTheDocument();
});
