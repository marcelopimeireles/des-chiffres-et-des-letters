import React from 'react';
import { act, render, screen } from '@testing-library/react';
import DeadlineClock from './DeadlineClock';

test('deadline countdown uses absolute time and signals expiry once', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
  try {
    const deadline = Date.now() + 3000;
    const expired = jest.fn();
    render(<DeadlineClock deadlineAt={deadline} running onExpire={expired} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Temps restant : 3 secondes');
    act(() => { jest.advanceTimersByTime(3100); });
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Temps restant : 0 secondes');
    expect(expired).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(expired).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
