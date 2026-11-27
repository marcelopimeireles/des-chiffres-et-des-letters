import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RiveStudio from './RiveStudio';

jest.mock('../components/RiveGameBoard', () => ({
  __esModule: true,
  default: ({ onAction }: { onAction: (action: string) => void }) => (
    <div>
      {['primary', 'secondary', 'backspace', 'auxiliary', 'refresh'].map(action => (
        <button key={action} type="button" onClick={() => onAction(action)}>{action}</button>
      ))}
    </div>
  )
}));
jest.mock('./RiveRound', () => ({ __esModule: true, default: ({ mode }: { mode: string }) => <div>{mode} round</div> }));
jest.mock('./SoloMatch', () => ({ __esModule: true, default: () => <div>solo match</div> }));

test('routes each studio menu action to its destination', () => {
  render(<MemoryRouter initialEntries={['/']}><RiveStudio /></MemoryRouter>);

  fireEvent.click(screen.getByRole('button', { name: 'primary' }));
  expect(screen.getByText('solo match')).toBeInTheDocument();
});

test('keeps the menu actions wired to letters, numbers, duels and final', () => {
  const actions = [
    ['secondary', 'letters round'],
    ['backspace', 'numbers round'],
    ['auxiliary', 'duel round'],
    ['refresh', 'final round']
  ];

  for (const [action, text] of actions) {
    cleanup();
    render(<MemoryRouter initialEntries={['/']}><RiveStudio /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(screen.getByText(text)).toBeInTheDocument();
  }
});
