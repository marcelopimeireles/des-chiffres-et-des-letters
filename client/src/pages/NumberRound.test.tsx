import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NumberRound from './NumberRound';
import {
  fetchNumbersDraw, fetchNumbersSolutions, validateNumbersAnswer
} from '../services/gameService';

vi.mock('../services/gameService', () => ({
  fetchNumbersDraw: vi.fn(),
  fetchNumbersSolutions: vi.fn(),
  validateNumbersAnswer: vi.fn()
}));

const mockedDraw = fetchNumbersDraw as jest.MockedFunction<typeof fetchNumbersDraw>;
const mockedValidate = validateNumbersAnswer as jest.MockedFunction<typeof validateNumbersAnswer>;
const mockedSolutions = fetchNumbersSolutions as jest.MockedFunction<typeof fetchNumbersSolutions>;

const draw = {
  drawId: 'sample-round', targetNumber: 117,
  numbers: [10, 5, 8, 3, 2, 1],
  largeCount: 2, deadlineAt: Date.now() + 45000, playSeconds: 45
};

beforeEach(() => {
  mockedDraw.mockReset();
  mockedValidate.mockReset();
  mockedSolutions.mockReset();
  mockedDraw.mockResolvedValue(draw);
});

const start = async () => {
  render(<MemoryRouter><NumberRound /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Lancer le tirage' }));
  await waitFor(() => expect(screen.getByRole('textbox', { name: /Votre expression/ })).toBeInTheDocument());
};

test('selects the count of large plates before draw and displays the target', async () => {
  render(<MemoryRouter><NumberRound /></MemoryRouter>);
  fireEvent.change(screen.getByRole('combobox', { name: 'Nombre de grandes plaques' }), {
    target: { value: '4' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lancer le tirage' }));
  await waitFor(() => expect(mockedDraw).toHaveBeenCalledWith(4));
  expect(await screen.findByText('117')).toBeInTheDocument();
});

test('builds a valid operation and can undo it', async () => {
  await start();
  const left = screen.getByRole('combobox', { name: 'Premier terme' });
  const right = screen.getByRole('combobox', { name: 'Second terme' });
  fireEvent.change(left, { target: { value: 'tile-0' } });
  fireEvent.change(right, { target: { value: 'tile-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
  expect(screen.getByText('10 + 5 = 15')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Votre expression/ })).toHaveValue('(10 + 5)');
  fireEvent.click(screen.getByRole('button', { name: 'Annuler l’étape' }));
  expect(screen.queryByText('10 + 5 = 15')).not.toBeInTheDocument();
});

test('backend alone awards scores and reveals the numerical best solution', async () => {
  await start();
  mockedValidate.mockResolvedValue({
    valid: true, reason: 'accepted', value: 117, distance: 0, exact: true, score: 10,
    solution: {
      value: 117, distance: 0, exact: true,
      expression: '((10 + 5) * 8) - 3', usedTiles: [0, 1, 2, 3],
      steps: [
        { left: 10, right: 5, operator: '+', result: 15 },
        { left: 15, right: 8, operator: '*', result: 120 },
        { left: 120, right: 3, operator: '-', result: 117 }
      ]
    }
  });
  fireEvent.change(screen.getByRole('textbox', { name: /Votre expression/ }), {
    target: { value: '(10 + 5) * 8 - 3' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
  await waitFor(() => expect(mockedValidate).toHaveBeenCalledWith('sample-round', '(10 + 5) * 8 - 3'));
  expect(await screen.findByText('10 points')).toBeInTheDocument();
  expect(screen.getByText(/Meilleur résultat trouvé/)).toBeInTheDocument();
  expect(screen.getByText('10 + 5 = 15')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Votre expression/ })).toBeDisabled();
});

test('invalid server result does not finish a round', async () => {
  await start();
  mockedValidate.mockResolvedValue({
    valid: false, reason: 'invalid_expression', score: 0, error: 'La division doit être exacte.'
  });
  fireEvent.change(screen.getByRole('textbox', { name: /Votre expression/ }), {
    target: { value: '10 / 3' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
  await waitFor(() => expect(screen.getByText('La division doit être exacte.')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Valider' })).toBeEnabled();
});
