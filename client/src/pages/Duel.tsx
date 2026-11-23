import React, { useEffect, useState } from 'react';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import { fetchDuel } from '../services/gameService';

const Duel: React.FC = () => {
  const [challenge, setChallenge] = useState('');
  const [answer, setAnswer] = useState('');
  const [type, setType] = useState('');
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [won, setWon] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDuel().then(data => {
      setChallenge(data.challenge);
      setAnswer(data.answer);
      setType(data.type);
    }).catch(() => setFeedback('Le serveur de jeu est indisponible.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const correct = input.trim().toLocaleUpperCase('fr') === answer.toLocaleUpperCase('fr');
    setWon(correct);
    setFeedback(correct ? 'Bonne réponse !' : 'Ce n’est pas la réponse attendue.');
  };

  return (
    <StudioRound number="03" title="Les duels"
      description="Un défi de rapidité. Découvrez l’énigme et proposez votre réponse."
      aside={<><CountdownClock seconds={30} resetKey={1} running={!loading && !won} />
        <p className="aside-note">Prototype : les différents types de duels seront ajoutés progressivement.</p></>}>
      <div className="puzzle-label">DÉFI : {type || 'CHARGEMENT'}</div>
      <div className="target-display" style={{ fontSize: 34, letterSpacing: 4 }}>{loading ? '···' : challenge}</div>
      <form className="answer-form" onSubmit={submit}>
        <label htmlFor="duel-answer">Votre réponse</label>
        <div className="answer-row">
          <input id="duel-answer" value={input} onChange={event => setInput(event.target.value)}
            placeholder="Votre solution…" disabled={loading || won} required />
          <button className="button button--primary" type="submit" disabled={loading || won}>Valider</button>
        </div>
      </form>
      {feedback && <p className={`answer-feedback ${won ? 'answer-feedback--success' : ''}`} role="status">{feedback}</p>}
    </StudioRound>
  );
};

export default Duel;
