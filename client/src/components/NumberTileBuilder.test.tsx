import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberTileBuilder from './NumberTileBuilder';
import { UiLanguageContext } from '../i18n';

function setup(numbers = [10,5,2], disabled = false) {
  const onCompose = jest.fn();
  render(<UiLanguageContext.Provider value="en"><NumberTileBuilder numbers={numbers} disabled={disabled} onCompose={onCompose}/></UiLanguageContext.Provider>);
  const choose = (value: number) => fireEvent.click(screen.getByRole('button',{name:String(value)}));
  const calculate = () => fireEvent.click(screen.getByRole('button',{name:'Calculate'}));
  const operation = (value: string) => fireEvent.change(screen.getByRole('combobox',{name:'Operation'}),{target:{value}});
  return {onCompose,choose,calculate,operation};
}
test('intermediate results can be reused without reusing consumed tiles', () => {
  const {onCompose,choose,calculate,operation} = setup();
  choose(10); choose(5); calculate();
  expect(onCompose).toHaveBeenLastCalledWith('(10 + 5)');
  expect(screen.queryByRole('button',{name:'10'})).not.toBeInTheDocument();
  choose(15); choose(2); operation('*'); calculate();
  expect(onCompose).toHaveBeenLastCalledWith('((10 + 5) * 2)');
});
test('rejects fractional division without consuming tiles', () => {
  const {onCompose,choose,calculate,operation} = setup([5,2]);
  choose(5); choose(2); operation('/'); calculate();
  expect(screen.getByRole('status')).toHaveTextContent('Invalid operation.');
  expect(onCompose).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'5'})).toBeInTheDocument();
});
test('undo and reset restore operands and expression', () => {
  const {onCompose,choose,calculate} = setup();
  choose(10); choose(5); calculate();
  fireEvent.click(screen.getByRole('button',{name:'Undo'}));
  expect(onCompose).toHaveBeenLastCalledWith('');
  expect(screen.getByRole('button',{name:'10'})).toBeInTheDocument();
  choose(10); choose(5); calculate();
  fireEvent.click(screen.getByRole('button',{name:'Reset'}));
  expect(onCompose).toHaveBeenLastCalledWith('');
  expect(screen.getByRole('button',{name:'5'})).toBeInTheDocument();
});
test('one physical tile cannot fill both operands', () => {
  const {choose,onCompose} = setup();
  choose(10); choose(10);
  expect(screen.getByRole('button',{name:'Calculate'})).toBeDisabled();
  expect(onCompose).not.toHaveBeenCalled();
});
test('disabled builder cannot perform operations', () => {
  setup([10,5],true);
  expect(screen.getByRole('button',{name:'10'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Calculate'})).toBeDisabled();
});
