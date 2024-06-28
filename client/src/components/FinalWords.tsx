import React, { useState, useEffect } from 'react';
import { fetchFinalWords } from '../services/gameService';

interface FinalWordsProps {
  wordSets: string[][];
}

const FinalWords: React.FC<FinalWordsProps> = () => {
  const [wordSets, setWordSets] = useState<string[][]>([]);
  const [currentSet, setCurrentSet] = useState<number>(0);
  const [input, setInput] = useState<string>('');
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    fetchFinalWords().then(data => {
      setWordSets(data.wordSets);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const longestWord = findLongestWord(wordSets[currentSet]);
    if (input.length >= longestWord.length) {
      setScore(score + 100);
    }
    setCurrentSet(currentSet + 1);
    setInput('');
  };

  return (
    <div>
      <h2>Final Words</h2>
      {currentSet < wordSets.length ? (
        <>
          <p>Letters: {wordSets[currentSet].join(', ')}</p>
          <form onSubmit={handleSubmit}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Enter the longest word" 
            />
            <button type="submit">Submit</button>
          </form>
        </>
      ) : (
        <p>Your final score: {score}</p>
      )}
    </div>
  );
};

const findLongestWord = (letters: string[]): string => {
  // Placeholder function for finding the longest word
  return 'example';
};

export default FinalWords;
