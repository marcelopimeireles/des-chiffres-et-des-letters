import React, { useEffect, useState } from 'react';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import { fetchFinalWords } from '../services/gameService';
import { canMakeWord } from '../utils/numbers';

const FinalWords: React.FC = () => {
  const [wordSets, setWordSets] = useState<string[][]>([]);
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [combinations, setCombinations] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinalWords().then(data => setWordSets(data.wordSets))
      .catch(() => setFeedback('Le serveur de jeu est indisponible.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canMakeWord(input, wordSets[current] || [])) {
      setFeedback('Cette combinaison ne peut pas être composée avec le tirage.');
      return;
    }
    setCombinations(value => value + 1);
    setCurrent(value => value + 1);
    setInput('');
    setFeedback('Combinaison reçue. Validation lexicale et points à venir.');
  };

  const completed = !loading && current >= wordSets.length && wordSets.length > 0;
  return (
    <StudioRound number="04" title="Les mots de la fin"
      description="L’épreuve finale : enchaînez les combinaisons de dix lettres."
      aside={<><CountdownClock seconds={120} resetKey={1} running={!loading && !completed} />
        <p className="aside-note">Prototype : {combinations} combinaison(s) acceptée(s), sans validation par dictionnaire ni attribution de points.</p></>}>
      <div className="puzzle-label">{completed ? 'ÉPREUVE TERMINÉE' : `TIRAGE ${Math.min(current + 1, wordSets.length)} / ${wordSets.length || '…'}`}</div>
      {completed ? <p className="answer-feedback answer-feedback--success">Vous avez parcouru tous les tirages disponibles.</p> :
        <><TileRack tiles={wordSets[current] || []} />
          <form className="answer-form" onSubmit={submit}>
            <label htmlFor="final-answer">Votre mot</label>
            <div className="answer-row">
              <input id="final-answer" value={input} onChange={event => setInput(event.target.value)}
                placeholder="Votre proposition…" maxLength={10} disabled={loading} required />
              <button className="button button--primary" type="submit" disabled={loading}>Valider</button>
            </div>
          </form></>}
      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
    </StudioRound>
  );
};

export default FinalWords;
