import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UiLanguageContext } from '../i18n';
import RiveRound from './RiveRound';
import { fetchLettersDraw } from '../services/gameService';

vi.mock('../components/useRiveClock', () => ({ useRiveClock: () => 30 }));
vi.mock('../components/RiveGameBoard', () => ({
  __esModule: true,
  default: ({ text, tiles, onAction }: { text: { caption: string; primaryLabel: string }; tiles: unknown[]; onAction: (action: string) => void }) => (
    <div>
      <div data-testid="caption">{text.caption}</div>
      <div data-testid="primary-label">{text.primaryLabel}</div>
      <div data-testid="tiles">{tiles.join(',')}</div>
      <button type="button" onClick={() => onAction('primary')}>primary-action</button>
    </div>
  )
}));
vi.mock('../components/InteractiveTiles', () => ({ default: () => null }));
vi.mock('../components/NumberTileBuilder', () => ({ default: () => null }));
vi.mock('../services/gameService', () => ({
  fetchLettersDraw: vi.fn(), fetchLettersSolutions: vi.fn(), validateLettersWord: vi.fn(),
  fetchNumbersDraw: vi.fn(), fetchNumbersSolutions: vi.fn(), validateNumbersAnswer: vi.fn(),
  createDuelDraw: vi.fn(), fetchDuelSolution: vi.fn(), validateDuelAnswer: vi.fn(),
  createFinaleDraw: vi.fn(), fetchFinaleSolutions: vi.fn(), validateFinaleWord: vi.fn(),
  skipFinaleWord: vi.fn()
}));

const mockedFetchLettersDraw = fetchLettersDraw as jest.MockedFunction<typeof fetchLettersDraw>;

test('starts a balanced letters round and updates the board state', async () => {
  mockedFetchLettersDraw.mockResolvedValue({
    drawId: 'letters-1',
    letters: ['A', 'B', 'E', 'C', 'I', 'D', 'O', 'F', 'U', 'G'],
    choices: ['vowel', 'consonant', 'vowel', 'consonant', 'vowel', 'consonant', 'vowel', 'consonant', 'vowel', 'consonant'],
    language: 'fr', deadlineAt: Date.now() + 30_000, revealDurationMs: 0, playSeconds: 30
  });

  render(<UiLanguageContext.Provider value="fr"><MemoryRouter><RiveRound mode="letters" /></MemoryRouter></UiLanguageContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'primary-action' }));

  await waitFor(() => expect(mockedFetchLettersDraw).toHaveBeenCalledWith([
    'vowel', 'consonant', 'vowel', 'consonant', 'vowel',
    'consonant', 'vowel', 'consonant', 'vowel', 'consonant'
  ], 'fr'));
  await waitFor(() => expect(screen.getByTestId('primary-label')).toHaveTextContent('Valider'));
  expect(screen.getByTestId('tiles')).toHaveTextContent('A,B,E,C,I,D,O,F,U,G');
});
