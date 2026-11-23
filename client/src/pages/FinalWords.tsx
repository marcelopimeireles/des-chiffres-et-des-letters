import React, { useEffect, useState } from 'react';
import DeadlineClock from '../components/DeadlineClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import {
  createFinaleDraw, fetchFinaleDraw, fetchFinaleSolutions,
  skipFinaleWord, validateFinaleWord, FinaleRound, FinaleSolutions, WordLanguage
} from '../services/gameService';

const FinalWords: React.FC = () => {
  const [language, setLanguage] = useState<WordLanguage>('fr');
  const [round, setRound] = useState<FinaleRound | null>(null);
  const [answers, setAnswers] = useState<FinaleSolutions | null>(null);
  const [word, setWord] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async (id: string) => {
    try { setRound(await fetchFinaleDraw(id)); }
    catch { setFeedback('Impossible de récupérer la finale.'); }
  };

  useEffect(() => {
    if (!round?.finished || answers) return;
    let active = true;
    fetchFinaleSolutions(round.drawId).then(data => {
      if (active) setAnswers(data);
    }).catch(() => {});
    return () => { active = false; };
  }, [round?.drawId, round?.finished, answers]);

  const start = async () => {
    if (busy) return;
    setBusy(true); setAnswers(null); setWord(''); setFeedback('');
    try { setRound(await createFinaleDraw(language)); }
    catch { setFeedback('Impossible de démarrer la finale.'); }
    finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!round?.current || round.finished || busy) return;
    setBusy(true);
    try {
      const response = await validateFinaleWord(round.drawId, round.current.index, word);
      if (response.valid) {
        setRound(response.round);
        setWord('');
        setFeedback('Mot accepté : 10 points.');
      } else {
        setFeedback(response.reason === 'not_in_dictionary' ? 'Mot absent du lexique.'
          : response.reason === 'letters_mismatch' ? 'Ces lettres ne permettent pas ce mot.'
            : 'Saisissez un mot de dix lettres.');
      }
    } catch {
      await refresh(round.drawId);
      setFeedback('Le temps est écoulé ou la proposition a été refusée.');
    } finally { setBusy(false); }
  };

  const skip = async () => {
    if (!round?.current || round.finished || busy) return;
    setBusy(true);
    try {
      const result = await skipFinaleWord(round.drawId, round.current.index);
      setRound(result); setWord(''); setFeedback('Mot passé : 0 point.');
    } catch {
      await refresh(round.drawId);
      setFeedback('Impossible de passer ce tirage.');
    } finally { setBusy(false); }
  };

  return (
    <StudioRound number="04" title="Les mots de la fin"
      animationCue={round?.finished && round.score > 0 ? 'success' : 'draw'}
      description="Huit anagrammes de dix lettres, deux minutes globales. 10 points par mot validé."
      aside={round && <><DeadlineClock deadlineAt={round.deadlineAt} totalSeconds={120}
        running={!round.finished} onExpire={() => void refresh(round.drawId)} />
        <p className="aside-note">Le temps continue entre les huit tirages et après un rechargement.</p></>}>
      {!round && <section className="challenge-setup">
        <label htmlFor="final-language">Langue du lexique
          <select id="final-language" value={language}
            onChange={event => setLanguage(event.target.value as WordLanguage)}>
            <option value="fr">Français</option><option value="pt">Português (Portugal)</option>
            <option value="en">English</option>
          </select>
        </label>
        <button className="button button--primary" type="button"
          disabled={busy} onClick={() => void start()}>Commencer la finale</button>
      </section>}

      {round && <section className="challenge-board">
        <p className="puzzle-label">TIRAGE {Math.min(round.currentIndex + 1, round.totalItems)} / {round.totalItems}</p>
        <p className="challenge-total">Score : <strong>{round.score} points</strong></p>
        {round.current && !round.finished && <>
          <TileRack tiles={round.current.letters} variant="letters" totalSlots={10}/>
          <form className="answer-form" onSubmit={event => void submit(event)}>
            <label htmlFor="final-answer">Votre mot de dix lettres</label>
            <div className="answer-row">
              <input id="final-answer" value={word} maxLength={30}
                onChange={event => setWord(event.target.value)}
                autoComplete="off" required disabled={busy}/>
              <button className="button button--primary" type="submit" disabled={busy}>Valider</button>
            </div>
          </form>
          <button className="text-button" type="button" disabled={busy}
            onClick={() => void skip()}>Passer ce mot</button>
        </>}
        {round.finished && <section className="match-review">
          <h2>Finale terminée : {round.score} points</h2>
          {answers && <ol className="challenge-answers">
            {answers.words.map((entry, index) => (
              <li key={index}>
                <strong>{index + 1}. {entry.target}</strong>
                <span>{entry.answer || 'Non résolu'} · {entry.score} points</span>
              </li>
            ))}
          </ol>}
          <button className="button button--primary" type="button"
            onClick={() => { setRound(null); setAnswers(null); setFeedback(''); setWord(''); }}>
            Nouvelle finale
          </button>
        </section>}
      </section>}
      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
    </StudioRound>
  );
};
export default FinalWords;
