import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import InteractiveTiles from './InteractiveTiles';
import { UiLanguageContext } from '../i18n';

function setup(disabled = false) {
  const onCompose = jest.fn();
  render(<UiLanguageContext.Provider value="en"><InteractiveTiles tiles={['A','A','B']} disabled={disabled} onCompose={onCompose}/></UiLanguageContext.Provider>);
  const rack = screen.getByRole('group', {name:'Available letters'});
  const word = screen.getByRole('group', {name:'Composed word'});
  const add = (id: number) => {
    fireEvent.click(within(rack).getByRole('button', {name: 'Available letters ' + (id === 2 ? 'B' : 'A') + ' ' + (id+1)}));
    fireEvent.click(screen.getByRole('button', {name:'Add to word'}));
  };
  return {onCompose,rack,word,add};
}
test('duplicate letters remain distinct physical tiles', () => {
  const {add,onCompose,rack,word} = setup();
  add(0); add(1);
  expect(onCompose).toHaveBeenLastCalledWith(['A','A']);
  expect(rack.querySelectorAll('[data-tile]')).toHaveLength(1);
  expect(word.querySelectorAll('[data-tile]')).toHaveLength(2);
});
test('undo and reset restore the tile pool', () => {
  const {add,onCompose,rack} = setup();
  add(0); add(2);
  fireEvent.click(screen.getByRole('button',{name:'Undo'}));
  expect(onCompose).toHaveBeenLastCalledWith(['A']);
  fireEvent.click(screen.getByRole('button',{name:'Reset'}));
  expect(onCompose).toHaveBeenLastCalledWith([]);
  expect(rack.querySelectorAll('[data-tile]')).toHaveLength(3);
});
test('shuffle preserves composed word and remaining tiles', () => {
  const {add,onCompose,rack} = setup();
  add(0);
  fireEvent.click(screen.getByRole('button',{name:'Shuffle'}));
  expect(onCompose).toHaveBeenLastCalledWith(['A']);
  expect(Array.from(rack.querySelectorAll('[data-tile]')).map(x=>x.getAttribute('data-tile')).sort()).toEqual(['1','2']);
});
test('disabled board cannot compose', () => {
  const {onCompose,rack} = setup(true);
  expect(within(rack).getByRole('button',{name:'Available letters A 1'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Reset'})).toBeDisabled();
  expect(onCompose).not.toHaveBeenCalled();
});
