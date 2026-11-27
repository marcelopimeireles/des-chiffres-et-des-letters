import { render } from '@testing-library/react';
import RiveScene from './RiveScene';

test('renders the CSS fallback when no Rive asset is configured', () => {
  const { container, getByText } = render(<RiveScene cue="draw" revision={1} />);

  expect(container.querySelector('.studio-visual')).toBeInTheDocument();
  expect(container.querySelector('.studio-fallback')).toBeInTheDocument();
  expect(getByText('DES CHIFFRES')).toBeInTheDocument();
  expect(getByText('DES LETTRES')).toBeInTheDocument();
  expect(container.querySelector('canvas')).not.toBeInTheDocument();
});

test('keeps the compact scene free of fallback artwork', () => {
  const { container } = render(<RiveScene compact />);

  expect(container.querySelector('.studio-visual--compact')).toBeInTheDocument();
  expect(container.querySelector('.studio-fallback')).not.toBeInTheDocument();
});
