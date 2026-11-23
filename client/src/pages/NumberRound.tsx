import React, { useCallback, useEffect, useState } from 'react';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import { fetchNumbersGame } from '../services/gameService';
import { evaluateNumbersExpression } from '../utils/numbers';

const NumberRound: React.FC = () => {
  const [target, setTarget] = useState(0);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [expression, setExpression] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(0);

  const draw = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setSuccess(false);
    setExpression('');
    try {
      const data = await fetchNumbersGame();
      setTarget(data.targetNumber);
      setNumbers(data.numbers);
      setRound(value => value + 1);
    } catch {
      setMessage('Impossible de joindre le serveur. Vérifiez que l’API est démarrée.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void draw(); }, [draw]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = evaluateNumbersExpression(expression, numbers);
      const exact = Math.abs(result - target) < 0.000001;
      setSuccess(exact);
      setMessage(exact
        ? 'Le compte est bon ! Bravo.'
        : `Votre résultat : ${Number(result.toFixed(2))}. Écart : ${Number(Math.abs(result - target).toFixed(2))}.`);
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : 'Expression invalide.');
    }
  };

  return (
    <StudioRound number="02" title="Le compte est bon"
      description="Six plaques, quatre opérations. Atteignez le nombre cible en utilisant chaque plaque au plus une fois."
      aside={<><CountdownClock seconds={45} resetKey={round} running={!loading && !success} />
        <p className="aside-note">Utilisez +, -, * et /, avec des parenthèses si nécessaire.</p></>}>
      <div className="puzzle-label">LE NOMBRE À ATTEINDRE</div>
      <div className="target-display">{loading ? '···' : target}</div>
      <div className="puzzle-label">LES SIX PLAQUES</div>
      <TileRack tiles={numbers} variant="numbers" />
      <form className="answer-form" onSubmit={submit}>
        <label htmlFor="number-answer">Votre calcul</label>
        <div className="answer-row">
          <input id="number-answer" value={expression}
            onChange={event => setExpression(event.target.value)}
            placeholder="(10 + 5) × 8 - 3" autoComplete="off"
            disabled={loading || success} required />
          <button className="button button--primary" type="submit" disabled={loading || success}>Vérifier</button>
        </div>
      </form>
      {message && <p className={`answer-feedback ${success ? 'answer-feedback--success' : ''}`} role="status">{message}</p>}
      <button type="button" className="text-button" onClick={() => void draw()} disabled={loading}>
        ↻ Nouveau tirage
      </button>
    </StudioRound>
  );
};

export default NumberRound;
