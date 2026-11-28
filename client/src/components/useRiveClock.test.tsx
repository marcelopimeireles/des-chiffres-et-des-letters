import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { useRiveClock } from './useRiveClock';

function ClockProbe({ deadline }: { deadline?: number }) {
  const seconds = useRiveClock(deadline);
  return <output data-testid="seconds">{seconds}</output>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Date, 'now').mockReturnValue(100_000);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('returns zero without a deadline and counts down to the deadline', () => {
  const { rerender } = render(<ClockProbe />);
  expect(screen.getByTestId('seconds')).toHaveTextContent('0');

  rerender(<ClockProbe deadline={103_000} />);
  expect(screen.getByTestId('seconds')).toHaveTextContent('3');

  act(() => {
    vi.spyOn(Date, 'now').mockReturnValue(101_200);
    vi.advanceTimersByTime(200);
  });
  expect(screen.getByTestId('seconds')).toHaveTextContent('2');
});

test('stops scheduling after expiry and clears timers on unmount', () => {
  const { unmount } = render(<ClockProbe deadline={101_000} />);
  expect(screen.getByTestId('seconds')).toHaveTextContent('1');

  act(() => {
    vi.spyOn(Date, 'now').mockReturnValue(101_000);
    vi.advanceTimersByTime(200);
  });
  expect(screen.getByTestId('seconds')).toHaveTextContent('0');
  expect(vi.getTimerCount()).toBe(0);

  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
