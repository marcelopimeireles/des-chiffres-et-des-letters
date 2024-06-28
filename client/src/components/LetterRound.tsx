import React, { useState, useEffect } from 'react';
import { fetchLettersGame } from '../services/gameService';

const LetterRound: React.FC = () => {
  const [letters, setLetters] = useState<string[]>([]);
  const [word, setWord] = useState<string>('');

  useEffect(() => {
    fetchLettersGame().then(data => {
      setLetters(data.letters);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Assume we have a function to check word validity
    const isValid = checkWordValidity(word);
    if (isValid) {
      alert('Valid word!');
    } else {
      alert('Invalid word!');
    }
  };

  return (
    <div>
      <h2>Letter Round</h2>
      <p>Letters: {letters.join(', ')}</p>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={word} 
          onChange={(e) => setWord(e.target.value)} 
          placeholder="Enter your word" 
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

const checkWordValidity = (word: string): boolean => {
  // Placeholder function for word validation
  const dictionary = ['example', 'words', 'from', 'dictionary'];
  return dictionary.includes(word.toLowerCase());
};

export default LetterRound;
