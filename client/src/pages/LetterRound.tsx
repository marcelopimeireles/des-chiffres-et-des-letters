import React, { useCallback, useEffect, useRef, useState } from 'react';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import { fetchLettersDraw, LetterKind } from '../services/gameService';
import { canMakeWord } from '../utils/numbers';

type RoundPhase = 'select' | 'loading' | 'revealing' | 'playing' | 'finished';
const LETTER_COUNT = 10;
const ROUND_SECONDS = 30;
const REVEAL_DELAY_MS = 230;

const LetterRound: React.FC = () => {
  const [choices, setChoices] = useState<LetterKind[]>([]);
  const [letters, setLetters] = useState<string[]>([]);
  const [visibleLetters, setVisibleLetters] = useState(0);
  const [word, setWord] = useState('');
  const [feedback, setFeedback] = useState('');
  const [phase, setPhase] = useState<RoundPhase>('select');
  const [round, setRound] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    return () => { requestRef.current += 1; };
  }, []);

  const choose = (kind: LetterKind) => {
    if (phase !== 'select') return;
    setChoices(current => current.length < LETTER_COUNT ? [...current, kind] : current);
    setFeedback('');
  };

  const autoChoose = () => {
    if (phase !== 'select') return;
    // Initial game variant: an automatic, balanced selection of five of each.
    const automatic: LetterKind[] = [
      ...Array<LetterKind>(5).fill('vowel'),
      ...Array<LetterKind>(5).fill('consonant')
    ];
    for (let i = automatic.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [automatic[i], automatic[j]] = [automatic[j], automatic[i]];
    }
    setChoices(automatic);
    setFeedback('');
  };

  const beginDraw = async () => {
    if (phase !== 'select' || choices.length !== LETTER_COUNT) return;
    const request = ++requestRef.current;
    setPhase('loading');
    setFeedback('');
    setLetters([]);
    setVisibleLetters(0);
    try {
      const data = await fetchLettersDraw(choices);
      if (request !== requestRef.current) return;
      if (!Array.isArray(data.letters) || data.letters.length !== LETTER_COUNT) {
        throw new Error('Tirage incomplet.');
      }
      setLetters(data.letters);
      setRound(current => current + 1);
      setPhase('revealing');
    } catch {
      if (request !== requestRef.current) return;
      setFeedback('Impossible de tirer les lettres. Vérifiez que le serveur est démarré, puis réessayez.');
      setPhase('select');
    }
  };

  useEffect(() => {
    if (phase !== 'revealing') return;
    if (visibleLetters >= letters.length) {
      setPhase('playing');
      return;
    }
    const timer = window.setTimeout(() => {
      setVisibleLetters(count => count + 1);
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [letters.length, phase, visibleLetters]);

  const expire = useCallback(() => {
    setPhase(current => current === 'playing' ? 'finished' : current);
    setFeedback(current => current || 'Temps écoulé. La ronde est terminée.');
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== 'playing') return;
    const possible = canMakeWord(word, letters);
    if (possible) {
      setPhase('finished');
      setFeedback(`« ${word.trim().toLocaleUpperCase('fr')} » utilise les lettres disponibles. La vérification dans un dictionnaire et les points restent à implémenter.`);
    } else {
      setFeedback('Cette combinaison ne peut pas être formée avec les dix lettres. Réessayez tant que le temps court.');
    }
  };

  const reset = () => {
    requestRef.current += 1;
    setPhase('select');
    setChoices([]);
    setLetters([]);
    setVisibleLetters(0);
    setWord('');
    setFeedback('');
  };

  const status = {
    select: 'Choisissez dix fois Voyelle ou Consonne, puis lancez le tirage.',
    loading: 'Le serveur prépare votre tirage…',
    revealing: `Révélation des lettres : ${visibleLetters} / ${LETTER_COUNT}`,
    playing: 'Le chrono tourne ! Composez votre mot.',
    finished: 'La ronde est terminée.'
  }[phase];

  return (
    <StudioRound number="01" title="Le mot le plus long"
      animationCue="draw" animationRevision={round}
      description="Choisissez vos voyelles et consonnes, découvrez les dix lettres et composez votre meilleur mot en trente secondes."
      aside={<>
        <CountdownClock seconds={ROUND_SECONDS} resetKey={round} running={phase === 'playing'} onExpire={expire} />
        <p className="aside-note">Le chrono ne démarre qu’après la révélation de la dernière lettre.</p>
      </>}>
      <div className="puzzle-label">VOTRE TIRAGE DE DIX LETTRES</div>
      <TileRack tiles={letters} variant="letters" totalSlots={LETTER_COUNT} revealedCount={visibleLetters} />
      <p className="letter-status" role="status">{status}</p>

      {phase === 'select' && <>
        <div className="letter-choices-header">
          <strong>Composez votre tirage</strong>
          <span>{choices.length} / {LETTER_COUNT} choix</span>
        </div>
        <div className="letter-choice-history" aria-label="Choix effectués">
          {choices.map((kind, index) => (
            <span key={index} className={`choice-chip choice-chip--${kind}`} aria-label={kind === 'vowel' ? 'Voyelle' : 'Consonne'}>
              {kind === 'vowel' ? 'V' : 'C'}
            </span>
          ))}
        </div>
        <div className="letter-choice-controls">
          <button type="button" className="button button--outline" disabled={choices.length >= LETTER_COUNT}
            onClick={() => choose('vowel')}>Voyelle</button>
          <button type="button" className="button button--outline" disabled={choices.length >= LETTER_COUNT}
            onClick={() => choose('consonant')}>Consonne</button>
          <button type="button" className="text-button" onClick={() => setChoices(current => current.slice(0, -1))}
            disabled={choices.length === 0}>Annuler un choix</button>
        </div>
        <div className="letter-draw-controls">
          <button className="button button--primary" type="button" onClick={() => void beginDraw()}
            disabled={choices.length !== LETTER_COUNT}>Lancer le tirage</button>
          <button className="text-button" type="button" onClick={autoChoose}>Tirage automatique (5 V / 5 C)</button>
        </div>
      </>}

      {(phase === 'playing' || phase === 'finished') && <>
        <form className="answer-form" onSubmit={submit}>
          <label htmlFor="letter-answer">Votre mot</label>
          <div className="answer-row">
            <input id="letter-answer" value={word} onChange={event => setWord(event.target.value)}
              placeholder="Composez votre mot…" autoComplete="off"
              maxLength={LETTER_COUNT} disabled={phase !== 'playing'} required />
            <button className="button button--primary" type="submit" disabled={phase !== 'playing'}>Proposer</button>
          </div>
        </form>
      </>}

      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
      <button type="button" className="text-button" onClick={reset}>
        ↻ Nouveau tirage
      </button>
    </StudioRound>
  );
};

export default LetterRound;
