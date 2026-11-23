import React, { useCallback, useEffect, useState } from 'react';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import DeadlineClock from '../components/DeadlineClock';
import {
  createSoloMatch, fetchLettersSolutions, fetchNumbersSolutions, fetchSoloMatch,
  nextSoloRound, validateLettersWord, validateNumbersAnswer,
  LetterSolutions, NumbersSolution, SoloMatch as SoloMatchData, WordLanguage
} from '../services/gameService';

const STORAGE_KEY = 'des-chiffres-et-des-lettres:solo-match';
const LANGUAGE_NAMES: Record<WordLanguage, string> = {
  fr: 'Français', pt: 'Português (Portugal)', en: 'English'
};

const RoundLabel: React.FC<{ kind: 'letters' | 'numbers' }> = ({ kind }) => (
  <>{kind === 'letters' ? 'Le mot le plus long' : 'Le compte est bon'}</>
);

const SoloMatch: React.FC = () => {
  const [match, setMatch] = useState<SoloMatchData | null>(null);
  const [language, setLanguage] = useState<WordLanguage>('fr');
  const [largeCount, setLargeCount] = useState(2);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [letterSolutions, setLetterSolutions] = useState<LetterSolutions | null>(null);
  const [numberSolution, setNumberSolution] = useState<NumbersSolution | null>(null);

  const load = useCallback(async (id: string) => {
    try {
      const result = await fetchSoloMatch(id);
      setMatch(result);
      setFeedback('');
    } catch (error) {
      const status = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 404) {
        window.localStorage.removeItem(STORAGE_KEY);
        setMatch(null);
        setFeedback('La partie précédente a expiré. Démarrez-en une nouvelle.');
      } else {
        setFeedback('Impossible de récupérer la partie. Vérifiez la connexion à l’API.');
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setRestoring(false);
    } else {
      fetchSoloMatch(saved).then(data => {
        if (active) setMatch(data);
      }).catch(error => {
        if (!active) return;
        const status = error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
        if (status === 404) {
          window.localStorage.removeItem(STORAGE_KEY);
          setFeedback('La partie sauvegardée a expiré. Vous pouvez en commencer une nouvelle.');
        } else {
          setFeedback('Connexion impossible. Actualisez pour reprendre votre partie.');
        }
      }).finally(() => {
        if (active) setRestoring(false);
      });
    }
    return () => { active = false; };
  }, []);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback('');
    try {
      const started = await createSoloMatch(language, largeCount);
      window.localStorage.setItem(STORAGE_KEY, started.matchId);
      setMatch(started);
      setAnswer('');
      setLetterSolutions(null);
      setNumberSolution(null);
    } catch {
      setFeedback('Impossible de créer la partie. Vérifiez le serveur.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setMatch(null);
    setAnswer('');
    setFeedback('');
    setLetterSolutions(null);
    setNumberSolution(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!match?.current || match.status !== 'playing' || busy || !answer.trim()) return;
    setBusy(true);
    setFeedback('');
    try {
      const result = match.current.kind === 'letters'
        ? await validateLettersWord(match.current.drawId, answer)
        : await validateNumbersAnswer(match.current.drawId, answer);
      if (!result.valid) {
        setFeedback(result.reason === 'not_in_dictionary'
          ? 'Ce mot est absent du lexique local.'
          : result.reason === 'letters_mismatch'
            ? 'Ce mot ne peut pas être formé avec ce tirage.'
            : result.reason === 'invalid_format'
              ? 'Saisissez un mot simple de dix lettres au maximum.'
              : ('error' in result && result.error) || 'Proposition invalide.');
        return;
      }
      const updated = await fetchSoloMatch(match.matchId);
      setMatch(updated);
      setFeedback(`Proposition acceptée. Score de la ronde : ${result.score} points.`);
    } catch (error) {
      const status = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 409) {
        await load(match.matchId);
        setFeedback('Le délai est écoulé. Consultez votre résultat.');
      } else {
        setFeedback('Vérification impossible. Réessayez ou actualisez le statut.');
      }
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!match || match.status !== 'review' || busy) return;
    setBusy(true);
    setFeedback('');
    try {
      const result = await nextSoloRound(match.matchId);
      setMatch(result);
      setAnswer('');
      setLetterSolutions(null);
      setNumberSolution(null);
    } catch {
      setFeedback('Impossible d’avancer. Actualisez le statut de la partie.');
    } finally {
      setBusy(false);
    }
  };

  const activeId = match?.current?.drawId;
  const phase = match?.status;
  const kind = match?.current?.kind;
  useEffect(() => {
    setLetterSolutions(null);
    setNumberSolution(null);
    if (phase !== 'review' || !activeId || !kind) return;
    let active = true;
    if (kind === 'letters') {
      fetchLettersSolutions(activeId).then(data => {
        if (active) setLetterSolutions(data);
      }).catch(() => {});
    } else {
      fetchNumbersSolutions(activeId).then(data => {
        if (active) setNumberSolution(data.solution);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [phase, activeId, kind]);

  const round = match?.current;
  const last = match?.history.find(item => item.index === round?.index);
  const finished = match?.status === 'finished';

  return (
    <StudioRound number="00" title="La partie solo" animationCue={match?.status === 'review' && (last?.score || 0) > 0 ? 'success' : 'draw'}
      animationRevision={(match?.currentIndex || 0) + 1}
      description="Six épreuves alternées, trois tirages de lettres et trois comptes. Chaque score est validé par le serveur."
      aside={round && !finished ? <>
        <DeadlineClock key={round.drawId} deadlineAt={round.deadlineAt}
          running={match?.status === 'playing'}
          onExpire={() => { if (match) void load(match.matchId); }} />
        <p className="aside-note">Le chrono est contrôlé par le serveur. Actualiser la page ne relance pas le temps.</p>
      </> : undefined}>
      {restoring && <p role="status">Récupération de votre partie…</p>}

      {!restoring && !match && <section className="match-setup">
        <h2>Nouvelle partie</h2>
        <p>Jouez six rondes et obtenez un score total. La partie reste disponible pendant une heure sur ce serveur.</p>
        <div className="match-setup-fields">
          <label htmlFor="match-language">Langue des lettres
            <select id="match-language" value={language}
              onChange={event => setLanguage(event.target.value as WordLanguage)}>
              <option value="fr">Français</option>
              <option value="pt">Português (Portugal)</option>
              <option value="en">English</option>
            </select>
          </label>
          <label htmlFor="match-large">Grandes plaques des comptes
            <select id="match-large" value={largeCount}
              onChange={event => setLargeCount(Number(event.target.value))}>
              {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <button className="button button--primary" type="button"
          onClick={() => void start()} disabled={busy}>Commencer la partie</button>
      </section>}

      {match && <section className="match-scoreboard" aria-label="Score de la partie">
        <div><span>PARTIE SOLO</span><strong>{match.currentIndex < match.totalRounds ? match.currentIndex + 1 : match.totalRounds} / {match.totalRounds}</strong></div>
        <div><span>LANGUE</span><strong>{LANGUAGE_NAMES[match.language]}</strong></div>
        <div><span>TOTAL</span><strong>{match.totalScore} points</strong></div>
      </section>}

      {match && round && !finished && <>
        <p className="puzzle-label">ÉPREUVE {round.index + 1} / {match.totalRounds}</p>
        <h2 className="match-round-title"><RoundLabel kind={round.kind} /></h2>
        {round.kind === 'letters'
          ? <>
            <TileRack tiles={round.letters || []} totalSlots={10} variant="letters" />
            <p className="match-instruction">Composez un mot en {LANGUAGE_NAMES[match.language]} avec les lettres ci-dessus.</p>
          </>
          : <>
            <div className="puzzle-label">LE NOMBRE À ATTEINDRE</div>
            <div className="target-display">{round.targetNumber}</div>
            <TileRack tiles={round.numbers || []} totalSlots={6} variant="numbers" />
            <p className="match-instruction">Saisissez un calcul avec +, −, ×, ÷ et des parenthèses, sans réutiliser une plaque.</p>
          </>}

        {match.status === 'playing' && <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="match-answer">{round.kind === 'letters' ? 'Votre mot' : 'Votre calcul'}</label>
          <div className="answer-row">
            <input id="match-answer" value={answer}
              onChange={event => setAnswer(event.target.value)}
              placeholder={round.kind === 'letters' ? 'Votre mot…' : '(10 + 5) * 8 - 3'}
              maxLength={round.kind === 'letters' ? 10 : 180}
              autoComplete="off" disabled={busy} required />
            <button className="button button--primary" type="submit" disabled={busy}>Valider</button>
          </div>
        </form>}

        {match.status === 'review' && <section className="match-review">
          <h3>Ronde terminée</h3>
          <p className="match-score-highlight">{last?.score ?? 0} points</p>
          <p>{last?.answer ? `Votre réponse : ${last.answer}` : 'Aucune réponse validée avant la fin du temps.'}</p>
          {round.kind === 'letters' && letterSolutions && <>
            <p>Meilleur mot du lexique : {letterSolutions.bestLength} lettres</p>
            <div className="letter-solution-list">{letterSolutions.bestWords.map(word => <span key={word}>{word}</span>)}</div>
          </>}
          {round.kind === 'numbers' && numberSolution && <>
            <p>Meilleur résultat : {numberSolution.value} (écart {numberSolution.distance})</p>
            <ol>{numberSolution.steps.map((step, i) => (
              <li key={i}>{step.left} {step.operator} {step.right} = {step.result}</li>
            ))}</ol>
          </>}
          <button className="button button--primary" type="button"
            disabled={busy} onClick={() => void next()}>
            {round.index + 1 === match.totalRounds ? 'Voir le résultat final' : 'Épreuve suivante'}
          </button>
        </section>}
      </>}

      {match && finished && <section className="match-final">
        <p className="eyebrow">PARTIE TERMINÉE</p>
        <h2>Votre résultat final</h2>
        <p className="match-total">{match.totalScore} <span>points</span></p>
        <p>Six épreuves terminées. Le score reflète uniquement les réponses validées par le serveur.</p>
        <button className="button button--primary" type="button" onClick={reset}>Nouvelle partie</button>
      </section>}

      {match && match.history.length > 0 && <section className="match-history" aria-label="Historique des rondes">
        <h2>Tableau des scores</h2>
        <ol>
          {match.history.map(item => <li key={item.drawId}>
            <span>{item.index + 1}. <RoundLabel kind={item.kind} /></span>
            <span>{item.answer || 'Temps écoulé'}</span>
            <strong>{item.score} pt{item.score === 1 ? '' : 's'}</strong>
          </li>)}
        </ol>
        <div className="match-history-total"><span>TOTAL</span><strong>{match.totalScore} points</strong></div>
      </section>}

      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
      {match && !finished && <div className="match-footer-actions">
        <button className="text-button" type="button"
          disabled={busy} onClick={() => void load(match.matchId)}>Actualiser le statut</button>
        <button className="text-button" type="button" disabled={busy} onClick={reset}>
          Abandonner la partie
        </button>
      </div>}
    </StudioRound>
  );
};

export default SoloMatch;
