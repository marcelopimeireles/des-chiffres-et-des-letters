import React, { useState, useEffect } from 'react';
import { fetchDuel } from '../services/gameService';

interface DuelProps {
  type: string;
  challenge: string;
  answer: string;
}

const Duel: React.FC<DuelProps> = () => {
  const [type, setType] = useState<string>('');
  const [challenge, setChallenge] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetchDuel().then(data => {
      setType(data.type);
      setChallenge(data.challenge);
      setAnswer(data.answer);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.toLowerCase() === answer.toLowerCase()) {
      setResult('Correct');
    } else {
      setResult('Incorrect');
    }
  };

  return (
    <div>
      <h2>Duel: {type}</h2>
      <p>Challenge: {challenge}</p>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Enter your answer" 
        />
        <button type="submit">Submit</button>
      </form>
      {result && <p>{result}</p>}
    </div>
  );
};

export default Duel;
