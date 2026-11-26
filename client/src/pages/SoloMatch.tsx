import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation, useGameLanguage } from '../i18n';
import StudioRound from '../components/StudioRound';
import InteractiveTiles from '../components/InteractiveTiles';
import NumberTileBuilder from '../components/NumberTileBuilder';
import TileRack from '../components/TileRack';
import DeadlineClock from '../components/DeadlineClock';
import {
  createSoloMatch, fetchLettersSolutions, fetchNumbersSolutions, fetchSoloMatch,
  nextSoloRound, validateLettersWord, validateNumbersAnswer,
  validateDuelAnswer, validateFinaleWord, skipFinaleWord,
  fetchDuelSolution, fetchFinaleSolutions,
  LetterSolutions, NumbersSolution, FinaleSolutions, SoloMatch as SoloMatchData, WordLanguage
} from '../services/gameService';

const RiveMatchBoard = React.lazy(() => import('../components/RiveMatchBoard'));

const STORAGE_KEY = 'des-chiffres-et-des-lettres:solo-match';
const LANGUAGE_NAMES: Record<WordLanguage, string> = {
  fr: 'Français', pt: 'Português', en: 'English'
};

const RoundLabel: React.FC<{ kind: 'letters' | 'numbers' | 'duel' | 'final' }> = ({ kind }) => {
  const t = useTranslation();
  return <>{kind === 'letters' ? t("Le mot le plus long", "Longest word", "Palavra mais longa") :
    kind === 'numbers' ? t("Le compte est bon", "Numbers challenge", "Desafio dos números") :
    kind === 'duel' ? t("Les duels", "Duels", "Duelos") : t("Les mots de la fin", "Final words", "Palavras finais")}</>;
};

const SoloMatch: React.FC<{ presentation?: 'classic' | 'rive' }> = ({ presentation = 'classic' }) => {
  const t = useTranslation();
  const [match, setMatch] = useState<SoloMatchData | null>(null);
  const language = useGameLanguage();
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

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
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

  if (presentation === 'rive') {
    const solution = letterSolutions?.bestWords.slice(0, 4).join(' · ') ||
      (numberSolution && `${numberSolution.expression} = ${numberSolution.value}`) ||
      duelSolution ||
      finaleSolutions?.words.map(item => item.target).join(' · ') || '';
    return <RiveMatchBoard
      match={match} language={language} largeCount={largeCount} answer={answer}
      feedback={feedback} solution={solution} busy={busy} restoring={restoring}
      onLargeCount={setLargeCount} onAnswer={setAnswer}
      onStart={() => void start()} onSubmit={() => void submit()}
      onNext={() => void next()} onReset={reset} onSkip={() => void skipFinalWord()}
      onRefresh={() => { if (match) void load(match.matchId); }}
    />;
  }

  return (
    <StudioRound number="00" title={t("La partie solo", "Solo match", "Partida individual")} animationCue={match?.status === 'review' && (last?.score || 0) > 0 ? 'success' : 'draw'}
      animationRevision={(match?.currentIndex || 0) + 1}
      description={t("Neuf épreuves : trois lettres, trois comptes, deux duels et une finale de huit mots. Les scores viennent du serveur.", "Nine rounds: three letters, three numbers, two duels and an eight-word final. Scores come from the server.", "Nove provas: três de letras, três de números, dois duelos e uma final de oito palavras. As pontuações vêm do servidor.")}
      aside={round && !finished ? <>
        <DeadlineClock key={round.drawId} deadlineAt={round.deadlineAt}
          totalSeconds={round.kind === 'final' ? 120 : round.kind === 'numbers' ? 45 : round.kind === 'letters' ? 33 : 30}
          running={match?.status === 'playing'}
          onExpire={() => { if (match) void load(match.matchId); }} />
        <p className="aside-note">{t("Le chrono est contrôlé par le serveur. Actualiser la page ne relance pas le temps.", "The server controls the timer. Reloading does not restart it.", "O servidor controla o cronómetro. Atualizar a página não reinicia o tempo.")}</p>
      </> : undefined}>
      {restoring && <p role="status">{t("Récupération de votre partie…", "Restoring your match…", "A recuperar a partida…")}</p>}

      {!restoring && !match && <section className="match-setup">
        <h2>{t("Nouvelle partie", "New match", "Nova partida")}</h2>
        <p>{t("Jouez trois rondes de lettres, trois comptes, deux duels et une finale de huit mots. La partie reste disponible pendant une heure sur ce serveur.", "Play three letters rounds, three numbers rounds, two duels and an eight-word final. Your match remains available for one hour.", "Jogue três rondas de letras, três de números, dois duelos e uma final de oito palavras. A partida fica disponível durante uma hora.")}</p>
        <div className="match-setup-fields">
          <label htmlFor="match-large">{t("Grandes plaques des comptes", "Large number tiles", "Peças numéricas grandes")}
            <select id="match-large" value={largeCount}
              onChange={event => setLargeCount(Number(event.target.value))}>
              {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <button className="button button--primary" type="button"
          onClick={() => void start()} disabled={busy}>{t("Commencer la partie", "Start match", "Iniciar partida")}</button>
      </section>}

      {match && <section className="match-scoreboard" aria-label={t("Score de la partie", "Match score", "Pontuação da partida")}>
        <div><span>{t("PARTIE SOLO", "SOLO MATCH", "PARTIDA INDIVIDUAL")}</span><strong>{match.currentIndex < match.totalRounds ? match.currentIndex + 1 : match.totalRounds} / {match.totalRounds}</strong></div>
        <div><span>{t("LANGUE", "LANGUAGE", "IDIOMA")}</span><strong>{LANGUAGE_NAMES[match.language]}</strong></div>
        <div><span>TOTAL</span><strong>{match.totalScore} {t('points','points','pontos')}</strong></div>
      </section>}

      {match && round && !finished && <>
        <p className="puzzle-label">{t('ÉPREUVE','ROUND','PROVA')} {round.index + 1} / {match.totalRounds}</p>
        <h2 className="match-round-title"><RoundLabel kind={round.kind} /></h2>
        {round.kind === 'letters' && <>
          <TileRack tiles={round.letters || []} totalSlots={10} variant="letters" />
          <p className="match-instruction">{t(`Composez un mot en ${LANGUAGE_NAMES[match.language]} avec les lettres ci-dessus.`, `Build a word in ${LANGUAGE_NAMES[match.language]} using the letters above.`, `Componha uma palavra em ${LANGUAGE_NAMES[match.language]} com as letras acima.`)}</p>
        </>}
        {round.kind === 'numbers' && <>
          <div className="puzzle-label">{t("LE NOMBRE À ATTEINDRE", "TARGET NUMBER", "NÚMERO ALVO")}</div>
          <div className="target-display">{round.targetNumber}</div>
          <TileRack tiles={round.numbers || []} totalSlots={6} variant="numbers" />
          <p className="match-instruction">{t("Saisissez un calcul avec +, −, ×, ÷ et des parenthèses, sans réutiliser une plaque.", "Enter a calculation using +, −, ×, ÷ and parentheses, without reusing a tile.", "Introduza um cálculo com +, −, ×, ÷ e parênteses, sem reutilizar peças.")}</p>
        </>}
        {round.kind === 'duel' && <>
          <p className="puzzle-label">{round.duelKind === 'anagram' ? t("ANAGRAMME", "ANAGRAM", "ANAGRAMA") : t("CALCUL MENTAL", "MENTAL ARITHMETIC", "CÁLCULO MENTAL")}</p>
          {round.duelKind === 'anagram'
            ? <TileRack tiles={round.letters || []} variant="letters" />
            : <div className="challenge-calculation">{round.challenge}</div>}
          <p className="match-instruction">{t("30 secondes pour répondre correctement. 8 points en jeu.", "30 seconds to answer correctly. 8 points at stake.", "30 segundos para responder corretamente. 8 pontos em jogo.")}</p>
        </>}
        {round.kind === 'final' && <>
          <p className="puzzle-label">
            {t('MOT','WORD','PALAVRA')} {Math.min((round.finaleIndex ?? 0) + 1, round.finaleTotal ?? 8)}
            {' / '}{round.finaleTotal ?? 8}
          </p>
          <p className="challenge-total">{t("Points de la finale :", "Final points:", "Pontos da final:")} <strong>{round.finaleScore ?? 0}</strong></p>
          {match.status === 'playing' &&
            <TileRack tiles={round.letters || []} variant="letters" totalSlots={10} />}
          <p className="match-instruction">{t("Trouvez un anagramme de dix lettres. Deux minutes pour huit mots.", "Find a ten-letter anagram. Two minutes for eight words.", "Encontre um anagrama de dez letras. Dois minutos para oito palavras.")}</p>
        </>}

        {match.status === 'playing' && (round.kind === 'letters' || round.kind === 'final' || (round.kind === 'duel' && round.duelKind === 'anagram')) &&
          <InteractiveTiles key={`${round.drawId}:${round.finaleIndex ?? 0}`} tiles={round.letters || []}
            disabled={busy} onCompose={values => setAnswer(values.join(''))} />}

        {match.status === 'playing' && round.kind === 'numbers' && <NumberTileBuilder key={round.drawId} numbers={round.numbers || []} disabled={busy} onCompose={setAnswer} />}
        {match.status === 'playing' && <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="match-answer">{round.kind === 'numbers' ? t("Votre calcul", "Your calculation", "O seu cálculo") :
            round.kind === 'duel' && round.duelKind === 'mental' ? t("Votre résultat", "Your result", "O seu resultado") : t("Votre mot", "Your word", "A sua palavra")}</label>
          <div className="answer-row">
            <input id="match-answer" value={answer}
              onChange={event => setAnswer(event.target.value)}
              placeholder={round.kind === 'numbers' ? '(10 + 5) * 8 - 3' : t("Votre réponse…", "Your answer…", "A sua resposta…")}
              maxLength={round.kind === 'numbers' ? 180 : 40}
              autoComplete="off" disabled={busy} required />
            <button className="button button--primary" type="submit" disabled={busy}>{t("Valider", "Submit", "Validar")}</button>
          </div>
        </form>}
        {round.kind === 'final' && match.status === 'playing' &&
          <button type="button" className="text-button" disabled={busy}
            onClick={() => void skipFinalWord()}>{t("Passer ce mot", "Skip word", "Saltar palavra")}</button>}

        {match.status === 'review' && <section className="match-review">
          <h3>{t("Ronde terminée", "Round finished", "Ronda terminada")}</h3>
          <p className="match-score-highlight">{last?.score ?? 0} {t('points','points','pontos')}</p>
          <p>{last?.answer ? t(`Votre réponse : ${last.answer}`, `Your answer: ${last.answer}`, `A sua resposta: ${last.answer}`) : t("Aucune réponse validée avant la fin du temps.", "No answer accepted before time expired.", "Nenhuma resposta validada antes do fim do tempo.")}</p>
          {round.kind === 'letters' && letterSolutions && <>
            <p>{t('Meilleur mot du lexique :','Longest dictionary word:','Maior palavra do dicionário:')} {letterSolutions.bestLength} {t('lettres','letters','letras')}</p>
            <div className="letter-solution-list">{letterSolutions.bestWords.map(word => <span key={word}>{word}</span>)}</div>
          </>}
          {round.kind === 'numbers' && numberSolution && <>
            <p>{t('Meilleur résultat :','Best result:','Melhor resultado:')} {numberSolution.value} ({t('écart','difference','diferença')} {numberSolution.distance})</p>
            <ol>{numberSolution.steps.map((step, i) => (
              <li key={i}>{step.left} {step.operator} {step.right} = {step.result}</li>
            ))}</ol>
          </>}
          {round.kind === 'duel' && duelSolution &&
            <p>{t("Réponse attendue :", "Expected answer:", "Resposta esperada:")} <strong>{duelSolution}</strong></p>}
          {round.kind === 'final' && finaleSolutions &&
            <ol className="challenge-answers">{finaleSolutions.words.map((item, index) => (
              <li key={index}><strong>{index + 1}. {item.target}</strong>
                <span>{item.answer || t("Non résolu", "Unsolved", "Não resolvido")} · {item.score} {t('points','points','pontos')}</span></li>
            ))}</ol>}
          <button className="button button--primary" type="button"
            disabled={busy} onClick={() => void next()}>
            {round.index + 1 === match.totalRounds ? t("Voir le résultat final", "View final result", "Ver resultado final") : t("Épreuve suivante", "Next round", "Próxima prova")}
          </button>
        </section>}
      </>}

      {match && finished && <section className="match-final">
        <p className="eyebrow">{t("PARTIE TERMINÉE", "MATCH FINISHED", "PARTIDA TERMINADA")}</p>
        <h2>{t("Votre résultat", "Your result", "O seu resultado")} final</h2>
        <p className="match-total">{match.totalScore} <span>{t('points','points','pontos')}</span></p>
        <p>{t("Neuf épreuves terminées, dont deux duels et une finale de huit mots. Tous les points sont validés par le serveur.", "Nine rounds completed, including two duels and an eight-word final. All points are validated by the server.", "Nove provas concluídas, incluindo dois duelos e uma final de oito palavras. Todos os pontos são validados pelo servidor.")}</p>
        <button className="button button--primary" type="button" onClick={reset}>{t("Nouvelle partie", "New match", "Nova partida")}</button>
      </section>}

      {match && match.history.length > 0 && <section className="match-history" aria-label={t("Historique des rondes", "Round history", "Histórico das rondas")}>
        <h2>{t("Tableau des scores", "Scoreboard", "Quadro de pontuações")}</h2>
        <ol>
          {match.history.map(item => <li key={item.drawId}>
            <span>{item.index + 1}. <RoundLabel kind={item.kind} /></span>
            <span>{item.answer || t("Temps écoulé", "Time expired", "Tempo esgotado")}</span>
            <strong>{item.score} pt{item.score === 1 ? '' : 's'}</strong>
          </li>)}
        </ol>
        <div className="match-history-total"><span>TOTAL</span><strong>{match.totalScore} {t('points','points','pontos')}</strong></div>
      </section>}

      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
      {match && !finished && <div className="match-footer-actions">
        <button className="text-button" type="button"
          disabled={busy} onClick={() => void load(match.matchId)}>{t("Actualiser le statut", "Refresh status", "Atualizar estado")}</button>
        <button className="text-button" type="button" disabled={busy} onClick={reset}>
          {t("Abandonner la partie", "Abandon match", "Abandonar partida")}
        </button>
      </div>}
    </StudioRound>
  );
};

export default SoloMatch;
