import React, { useCallback, useEffect, useState } from 'react';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import DeadlineClock from '../components/DeadlineClock';
import {
  createSoloMatch, fetchLettersSolutions, fetchNumbersSolutions, fetchSoloMatch,
  nextSoloRound, validateLettersWord, validateNumbersAnswer,
  validateDuelAnswer, validateFinaleWord, skipFinaleWord,
  fetchDuelSolution, fetchFinaleSolutions,
  LetterSolutions, NumbersSolution, FinaleSolutions, SoloMatch as SoloMatchData, WordLanguage
} from '../services/gameService';

const STORAGE_KEY = 'des-chiffres-et-des-lettres:solo-match';
const LANGUAGE_NAMES: Record<WordLanguage, string> = {
  fr: 'Français', pt: 'Português (Portugal)', en: 'English'
};

const RoundLabel: React.FC<{ kind: 'letters' | 'numbers' | 'duel' | 'final' }> = ({ kind }) => (
  <>{kind === 'letters' ? 'Le mot le plus long' :
    kind === 'numbers' ? 'Le compte est bon' :
    kind === 'duel' ? 'Les duels' : 'Les mots de la fin'}</>
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
  const [duelSolution, setDuelSolution] = useState('');
  const [finaleSolutions, setFinaleSolutions] = useState<FinaleSolutions | null>(null);

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
      const current = match.current;
      const result = current.kind === 'letters'
        ? await validateLettersWord(current.drawId, answer)
        : current.kind === 'numbers'
          ? await validateNumbersAnswer(current.drawId, answer)
          : current.kind === 'duel'
            ? await validateDuelAnswer(current.drawId, answer)
            : await validateFinaleWord(current.drawId, current.finaleIndex ?? 0, answer);
      if (!result.valid) {
        setFeedback(result.reason === 'not_in_dictionary'
          ? 'Ce mot est absent du lexique local.'
          : result.reason === 'letters_mismatch'
            ? 'Ce mot ne peut pas être formé avec ce tirage.'
            : result.reason === 'invalid_format'
              ? 'Saisissez un mot valable pour cette épreuve.'
              : ('error' in result && result.error) || 'Proposition incorrecte.');
        return;
      }
      const updated = await fetchSoloMatch(match.matchId);
      setMatch(updated);
      if (current.kind === 'final') {
        setAnswer('');
        setFeedback('Mot accepté : 10 points. Passez au tirage suivant.');
      } else {
        setFeedback(`Proposition acceptée. Score de la ronde : ${result.score} points.`);
      }
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

  const skipFinalWord = async () => {
    if (!match?.current || match.current.kind !== 'final' ||
        match.status !== 'playing' || busy) return;
    setBusy(true);
    try {
      await skipFinaleWord(match.current.drawId, match.current.finaleIndex ?? 0);
      const updated = await fetchSoloMatch(match.matchId);
      setMatch(updated);
      setAnswer('');
      setFeedback('Tirage passé sans points.');
    } catch {
      await load(match.matchId);
      setFeedback('Impossible de passer ce tirage.');
    } finally { setBusy(false); }
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
    setDuelSolution('');
    setFinaleSolutions(null);
    if (phase !== 'review' || !activeId || !kind) return;
    let active = true;
    if (kind === 'letters') {
      fetchLettersSolutions(activeId).then(data => {
        if (active) setLetterSolutions(data);
      }).catch(() => {});
    } else if (kind === 'numbers') {
      fetchNumbersSolutions(activeId).then(data => {
        if (active) setNumberSolution(data.solution);
      }).catch(() => {});
    } else if (kind === 'duel') {
      fetchDuelSolution(activeId).then(data => {
        if (active) setDuelSolution(data.answer);
      }).catch(() => {});
    } else if (kind === 'final') {
      fetchFinaleSolutions(activeId).then(data => {
        if (active) setFinaleSolutions(data);
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
      description="Neuf épreuves : trois lettres, trois comptes, deux duels et une finale de huit mots. Les scores viennent du serveur."
      aside={round && !finished ? <>
        <DeadlineClock key={round.drawId} deadlineAt={round.deadlineAt}
          totalSeconds={round.kind === 'final' ? 120 : round.kind === 'numbers' ? 45 : round.kind === 'letters' ? 33 : 30}
          running={match?.status === 'playing'}
          onExpire={() => { if (match) void load(match.matchId); }} />
        <p className="aside-note">Le chrono est contrôlé par le serveur. Actualiser la page ne relance pas le temps.</p>
      </> : undefined}>
      {restoring && <p role="status">Récupération de votre partie…</p>}

      {!restoring && !match && <section className="match-setup">
        <h2>Nouvelle partie</h2>
        <p>Jouez trois rondes de lettres, trois comptes, deux duels et une finale de huit mots. La partie reste disponible pendant une heure sur ce serveur.</p>
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
        {round.kind === 'letters' && <>
          <TileRack tiles={round.letters || []} totalSlots={10} variant="letters" />
          <p className="match-instruction">Composez un mot en {LANGUAGE_NAMES[match.language]} avec les lettres ci-dessus.</p>
        </>}
        {round.kind === 'numbers' && <>
          <div className="puzzle-label">LE NOMBRE À ATTEINDRE</div>
          <div className="target-display">{round.targetNumber}</div>
          <TileRack tiles={round.numbers || []} totalSlots={6} variant="numbers" />
          <p className="match-instruction">Saisissez un calcul avec +, −, ×, ÷ et des parenthèses, sans réutiliser une plaque.</p>
        </>}
        {round.kind === 'duel' && <>
          <p className="puzzle-label">{round.duelKind === 'anagram' ? 'ANAGRAMME' : 'CALCUL MENTAL'}</p>
          {round.duelKind === 'anagram'
            ? <TileRack tiles={round.letters || []} variant="letters" />
            : <div className="challenge-calculation">{round.challenge}</div>}
          <p className="match-instruction">30 secondes pour répondre correctement. 8 points en jeu.</p>
        </>}
        {round.kind === 'final' && <>
          <p className="puzzle-label">
            MOT {Math.min((round.finaleIndex ?? 0) + 1, round.finaleTotal ?? 8)}
            {' / '}{round.finaleTotal ?? 8}
          </p>
          <p className="challenge-total">Points de la finale : <strong>{round.finaleScore ?? 0}</strong></p>
          {match.status === 'playing' &&
            <TileRack tiles={round.letters || []} variant="letters" totalSlots={10} />}
          <p className="match-instruction">Trouvez un anagramme de dix lettres. Deux minutes pour huit mots.</p>
        </>}

        {match.status === 'playing' && <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="match-answer">{round.kind === 'numbers' ? 'Votre calcul' :
            round.kind === 'duel' && round.duelKind === 'mental' ? 'Votre résultat' : 'Votre mot'}</label>
          <div className="answer-row">
            <input id="match-answer" value={answer}
              onChange={event => setAnswer(event.target.value)}
              placeholder={round.kind === 'numbers' ? '(10 + 5) * 8 - 3' : 'Votre réponse…'}
              maxLength={round.kind === 'numbers' ? 180 : 40}
              autoComplete="off" disabled={busy} required />
            <button className="button button--primary" type="submit" disabled={busy}>Valider</button>
          </div>
        </form>}
        {round.kind === 'final' && match.status === 'playing' &&
          <button type="button" className="text-button" disabled={busy}
            onClick={() => void skipFinalWord()}>Passer ce mot</button>}

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
          {round.kind === 'duel' && duelSolution &&
            <p>Réponse attendue : <strong>{duelSolution}</strong></p>}
          {round.kind === 'final' && finaleSolutions &&
            <ol className="challenge-answers">{finaleSolutions.words.map((item, index) => (
              <li key={index}><strong>{index + 1}. {item.target}</strong>
                <span>{item.answer || 'Non résolu'} · {item.score} points</span></li>
            ))}</ol>}
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
        <p>Neuf épreuves terminées, dont deux duels et une finale de huit mots. Tous les points sont validés par le serveur.</p>
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
