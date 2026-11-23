import React, { useEffect, useState } from 'react';
import DeadlineClock from '../components/DeadlineClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import {
  createDuelDraw, fetchDuelDraw, fetchDuelSolution,
  validateDuelAnswer, DuelKind, DuelRound, WordLanguage
} from '../services/gameService';

const Duel: React.FC = () => {
  const [kind, setKind] = useState<DuelKind>('anagram');
  const [language, setLanguage] = useState<WordLanguage>('fr');
  const [round, setRound] = useState<DuelRound | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [solution, setSolution] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async (id: string) => {
    try { setRound(await fetchDuelDraw(id)); }
    catch { setFeedback('Impossible de récupérer le duel.'); }
  };

  useEffect(() => {
    if (!round?.finished || solution) return;
    let alive = true;
    fetchDuelSolution(round.drawId).then(data => {
      if (alive) setSolution(data.answer);
    }).catch(() => {});
    return () => { alive = false; };
  }, [round?.drawId, round?.finished, solution]);

  const start = async () => {
    if (busy) return;
    setBusy(true); setFeedback(''); setSolution(''); setInput('');
    try { setRound(await createDuelDraw(kind, language)); }
    catch { setFeedback('Impossible de créer le duel.'); }
    finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!round || round.finished || busy) return;
    setBusy(true);
    try {
      const attempt = await validateDuelAnswer(round.drawId, input);
      setFeedback(attempt.valid
        ? `Bonne réponse ! ${attempt.score} points.`
        : attempt.reason === 'invalid_format'
          ? 'Format incorrect pour ce duel.' : 'Réponse incorrecte, réessayez.');
      if (attempt.valid) await refresh(round.drawId);
    } catch {
      await refresh(round.drawId);
      setFeedback('Le duel est terminé ou la réponse ne peut être vérifiée.');
    } finally { setBusy(false); }
  };

  return (
    <StudioRound number="03" title="Les duels"
      animationCue={round?.finished && round.score > 0 ? 'success' : 'draw'}
      description="Deux types de duel : trouver un anagramme ou résoudre un calcul mental. Validation côté serveur."
      aside={round && <><DeadlineClock deadlineAt={round.deadlineAt}
        running={!round.finished} onExpire={() => void refresh(round.drawId)} />
        <p className="aside-note">30 secondes par duel. 8 points pour une bonne réponse.</p></>}>
      {!round && <section className="challenge-setup">
        <label htmlFor="duel-kind">Type de duel
          <select id="duel-kind" value={kind} onChange={event => setKind(event.target.value as DuelKind)}>
            <option value="anagram">Anagramme</option><option value="mental">Calcul mental</option>
          </select>
        </label>
        <label htmlFor="duel-language">Langue
          <select id="duel-language" value={language}
            onChange={event => setLanguage(event.target.value as WordLanguage)}>
            <option value="fr">Français</option><option value="pt">Português (Portugal)</option>
            <option value="en">English</option>
          </select>
        </label>
        <button className="button button--primary" type="button" disabled={busy}
          onClick={() => void start()}>Commencer le duel</button>
      </section>}

      {round && <section className="challenge-board">
        <p className="puzzle-label">{round.kind === 'anagram' ? 'ANAGRAMME' : 'CALCUL MENTAL'}</p>
        {round.kind === 'anagram'
          ? <TileRack tiles={round.letters || []} variant="letters" />
          : <div className="challenge-calculation">{round.challenge}</div>}
        {!round.finished && <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="duel-answer">{round.kind === 'anagram' ? 'Votre mot' : 'Votre résultat'}</label>
          <div className="answer-row">
            <input id="duel-answer" value={input} autoComplete="off" required
              onChange={event => setInput(event.target.value)} disabled={busy} maxLength={40} />
            <button className="button button--primary" type="submit" disabled={busy}>Valider</button>
          </div>
        </form>}
        {round.finished && <section className="match-review">
          <h3>Duel terminé</h3>
          <p className="match-score-highlight">{round.score} points</p>
          {solution && <p>Réponse attendue : <strong>{solution}</strong></p>}
          <button className="button button--primary" type="button"
            onClick={() => { setRound(null); setInput(''); setFeedback(''); setSolution(''); }}>
            Nouveau duel
          </button>
        </section>}
      </section>}
      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
    </StudioRound>
  );
};
export default Duel;
