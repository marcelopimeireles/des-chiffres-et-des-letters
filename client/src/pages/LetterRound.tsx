import React, { useCallback, useEffect, useState } from 'react';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import { fetchLettersGame } from '../services/gameService';
import { canMakeWord } from '../utils/numbers';

const LetterRound: React.FC = () => {
  const [letters, setLetters] = useState<string[]>([]);
  const [word, setWord] = useState('');
  const [feedback, setFeedback] = useState('');
  const [validCombination, setValidCombination] = useState(false);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);

  const draw = useCallback(async () => {
    setLoading(true);
    setWord('');
    setFeedback('');
    setValidCombination(false);
    try {
      const data = await fetchLettersGame();
      setLetters(data.letters);
      setRound(value => value + 1);
    } catch {
      setFeedback('Impossible de joindre le serveur. Vérifiez que l’API est démarrée.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void draw(); }, [draw]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const possible = canMakeWord(word, letters);
    setValidCombination(possible);
    setFeedback(possible
      ? `« ${word.toLocaleUpperCase('fr')} » utilise bien les lettres du tirage. La validation dans un dictionnaire reste à implémenter.`
      : 'Ce mot ne peut pas être composé avec les lettres tirées.');
  };

  return (
    <StudioRound number="01" title="Le mot le plus long"
      description="Dix lettres à votre disposition. Trouvez la combinaison la plus longue avant la fin du compte à rebours."
      aside={<><CountdownClock seconds={30} resetKey={round} running={!loading && !validCombination} />
        <p className="aside-note">Chaque lettre ne peut être utilisée qu’une seule fois par occurrence.</p></>}>
      <div className="puzzle-label">VOTRE TIRAGE DE DIX LETTRES</div>
      <TileRack tiles={letters} variant="letters" />
      <form className="answer-form" onSubmit={submit}>
        <label htmlFor="letter-answer">Votre mot</label>
        <div className="answer-row">
          <input id="letter-answer" value={word}
            onChange={event => setWord(event.target.value)}
            placeholder="Composez votre mot…" autoComplete="off"
            maxLength={10} disabled={loading} required />
          <button className="button button--primary" disabled={loading} type="submit">Proposer</button>
        </div>
      </form>
      {feedback && <p className={`answer-feedback ${validCombination ? 'answer-feedback--success' : ''}`} role="status">{feedback}</p>}
      <button type="button" className="text-button" onClick={() => void draw()} disabled={loading}>
        ↻ Nouveau tirage
      </button>
    </StudioRound>
  );
};

export default LetterRound;
