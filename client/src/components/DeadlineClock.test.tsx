import React from 'react';
import { vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import DeadlineClock from './DeadlineClock';

test('deadline countdown uses absolute time and signals expiry once', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
  try {
    const deadline = Date.now() + 3000;
    const expired = vi.fn();
    render(<DeadlineClock deadlineAt={deadline} running onExpire={expired} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Temps restant : 3 secondes');
    act(() => { vi.advanceTimersByTime(3100); });
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Temps restant : 0 secondes');
    expect(expired).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(expired).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
