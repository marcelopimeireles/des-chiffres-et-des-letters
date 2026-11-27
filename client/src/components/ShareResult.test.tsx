import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShareResult from './ShareResult';

const originalClipboard = navigator.clipboard;
const originalShare = navigator.share;

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
  Object.defineProperty(navigator, 'share', { configurable: true, value: originalShare });
  jest.restoreAllMocks();
});

test('copies the localized result and exposes social links', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

  render(<ShareResult score={42} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copier le résultat' }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('42')));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copié !'));
  expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', expect.stringContaining('wa.me'));
  expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', expect.stringContaining('facebook.com'));
  expect(screen.getByRole('link', { name: 'X' })).toHaveAttribute('href', expect.stringContaining('twitter.com'));
  expect(screen.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', expect.stringContaining('t.me'));
});

test('falls back to copy when native sharing is unavailable or cancelled', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });

  render(<ShareResult score={10} />);
  fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());

  const share = jest.fn().mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
  await waitFor(() => expect(share).toHaveBeenCalled());
  expect(writeText).toHaveBeenCalledTimes(1);
});
