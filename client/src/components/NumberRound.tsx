import React, { useState, useEffect } from 'react';
import { fetchNumbersGame } from '../services/gameService';

interface NumberRoundProps {
  targetNumber: number;
  numbers: number[];
}

const NumberRound: React.FC<NumberRoundProps> = () => {
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetchNumbersGame().then(data => {
      setTargetNumber(data.targetNumber);
      setNumbers(data.numbers);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // eslint-disable-next-line no-eval
      const evaluatedResult = eval(input);
      if (evaluatedResult === targetNumber) {
        setResult('Correct');
      } else {
        setResult(`Incorrect. Your result: ${evaluatedResult}`);
      }
    } catch (error) {
      setResult('Invalid Expression');
    }
  };

  return (
    <div>
      <h2>Number Round</h2>
      <p>Target Number: {targetNumber}</p>
      <p>Available Numbers: {numbers.join(', ')}</p>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Enter your expression" 
        />
        <button type="submit">Submit</button>
      </form>
      {result && <p>{result}</p>}
    </div>
  );
};

export default NumberRound;
