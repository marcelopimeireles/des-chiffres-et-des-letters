import { act, render, screen } from '@testing-library/react';
import { useRiveClock } from './useRiveClock';

function ClockProbe({ deadline }: { deadline?: number }) {
  const seconds = useRiveClock(deadline);
  return <output data-testid="seconds">{seconds}</output>;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Date, 'now').mockReturnValue(100_000);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('returns zero without a deadline and counts down to the deadline', () => {
  const { rerender } = render(<ClockProbe />);
  expect(screen.getByTestId('seconds')).toHaveTextContent('0');

  rerender(<ClockProbe deadline={103_000} />);
  expect(screen.getByTestId('seconds')).toHaveTextContent('3');

  act(() => {
    jest.spyOn(Date, 'now').mockReturnValue(101_200);
    jest.advanceTimersByTime(200);
  });
  expect(screen.getByTestId('seconds')).toHaveTextContent('2');
});

test('stops scheduling after expiry and clears timers on unmount', () => {
  const { unmount } = render(<ClockProbe deadline={101_000} />);
  expect(screen.getByTestId('seconds')).toHaveTextContent('1');

  act(() => {
    jest.spyOn(Date, 'now').mockReturnValue(101_000);
    jest.advanceTimersByTime(200);
  });
  expect(screen.getByTestId('seconds')).toHaveTextContent('0');
  expect(jest.getTimerCount()).toBe(0);

  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
