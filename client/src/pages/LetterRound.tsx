import React, { useCallback, useEffect, useRef, useState } from 'react';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import {
  fetchLettersDraw, LetterKind, WordLanguage, validateLettersWord,
  WordValidationReason
} from '../services/gameService';
import { canMakeWord } from '../utils/numbers';

type RoundPhase = 'select' | 'loading' | 'revealing' | 'playing' | 'checking' | 'finished';
const LETTER_COUNT = 10;
const ROUND_SECONDS = 30;
const REVEAL_DELAY_MS = 230;

const VALIDATION_MESSAGES: Record<WordValidationReason, string> = {
  accepted: 'Mot reconnu par le dictionnaire.',
  not_in_dictionary: 'Mot non trouvé dans le dictionnaire de la langue choisie.',
  letters_mismatch: 'Ce mot ne peut pas être composé avec les lettres tirées.',
  invalid_format: 'Seuls les mots simples de 1 à 10 lettres sont acceptés.'
};

const languageLabel: Record<WordLanguage, string> = {
  fr: 'Français',
  en: 'English',
  pt: 'Português (Brasil)'
};

const LetterRound: React.FC = () => {
  const [language, setLanguage] = useState<WordLanguage>('fr');
  const [choices, setChoices] = useState<LetterKind[]>([]);
  const [letters, setLetters] = useState<string[]>([]);
  const [drawId, setDrawId] = useState('');
  const [visibleLetters, setVisibleLetters] = useState(0);
  const [word, setWord] = useState('');
  const [feedback, setFeedback] = useState('');
  const [validated, setValidated] = useState(false);
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
    setValidated(false);
    setDrawId('');
    setLetters([]);
    setVisibleLetters(0);
    try {
      const data = await fetchLettersDraw(choices, language);
      if (request !== requestRef.current) return;
      if (!Array.isArray(data.letters) || data.letters.length !== LETTER_COUNT ||
          typeof data.drawId !== 'string' || data.language !== language) {
        throw new Error('Tirage incomplet.');
      }
      setLetters(data.letters);
      setDrawId(data.drawId);
      setRound(current => current + 1);
      setPhase('revealing');
    } catch {
      if (request !== requestRef.current) return;
      setFeedback('Impossible de tirer les lettres. Vérifiez le serveur puis réessayez.');
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== 'playing' || !drawId) return;
    if (!canMakeWord(word, letters)) {
      setFeedback('Ce mot ne peut pas être composé avec les lettres tirées.');
      return;
    }
    const request = ++requestRef.current;
    setPhase('checking');
    setFeedback('Vérification dans le dictionnaire…');
    try {
      const result = await validateLettersWord(drawId, word);
      if (request !== requestRef.current) return;
      if (result.language !== language) throw new Error('Language mismatch');
      if (result.valid) {
        setValidated(true);
        setPhase('finished');
        setFeedback(`« ${word.trim().toLocaleUpperCase()} » — ${VALIDATION_MESSAGES.accepted} La notation sera ajoutée dans la prochaine étape.`);
      } else {
        setFeedback(VALIDATION_MESSAGES[result.reason] || 'Mot refusé.');
        setPhase('playing');
      }
    } catch {
      if (request !== requestRef.current) return;
      setFeedback('Dictionnaire indisponible ou tirage expiré. Réessayez ; aucun mot non vérifié ne sera accepté.');
      setPhase('playing');
    }
  };

  const reset = () => {
    requestRef.current += 1;
    setPhase('select');
    setChoices([]);
    setLetters([]);
    setDrawId('');
    setVisibleLetters(0);
    setWord('');
    setFeedback('');
    setValidated(false);
  };

  const status = {
    select: 'Choisissez dix fois Voyelle ou Consonne, puis lancez le tirage.',
    loading: 'Le serveur prépare votre tirage…',
    revealing: `Révélation des lettres : ${visibleLetters} / ${LETTER_COUNT}`,
    playing: 'Le chrono tourne ! Composez votre mot.',
    checking: 'Le dictionnaire vérifie votre proposition…',
    finished: 'La ronde est terminée.'
  }[phase];

  return (
    <StudioRound number="01" title="Le mot le plus long"
      animationCue={validated ? 'success' : 'draw'} animationRevision={round}
      description="Choisissez la langue et les lettres de votre tirage, puis composez un mot présent dans le dictionnaire."
      aside={<>
        <CountdownClock seconds={ROUND_SECONDS} resetKey={round}
          running={phase === 'playing'} onExpire={expire} />
        <p className="aside-note">Le chronomètre démarre après la dernière lettre. Il est suspendu pendant la consultation du dictionnaire.</p>
      </>}>
      <div className="language-selector">
        <label htmlFor="word-language">Langue du dictionnaire</label>
        <select id="word-language" value={language} disabled={phase !== 'select'}
          onChange={event => setLanguage(event.target.value as WordLanguage)}>
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="pt">Português (Brasil)</option>
        </select>
        <span className="language-selector-hint">
          {phase === 'select' ? 'À choisir avant le tirage.' : `Tirage en ${languageLabel[language]}`}
        </span>
      </div>

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

      {(phase === 'playing' || phase === 'checking' || phase === 'finished') && <>
        <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="letter-answer">Votre mot en {languageLabel[language]}</label>
          <div className="answer-row">
            <input id="letter-answer" value={word} onChange={event => setWord(event.target.value)}
              placeholder="Composez votre mot…" autoComplete="off"
              maxLength={LETTER_COUNT} disabled={phase !== 'playing'} required />
            <button className="button button--primary" type="submit" disabled={phase !== 'playing'}>
              {phase === 'checking' ? 'Vérification…' : 'Valider'}
            </button>
          </div>
        </form>
      </>}

      {feedback && <p className={`answer-feedback ${validated ? 'answer-feedback--success' : ''}`} role="status">{feedback}</p>}
      <button type="button" className="text-button" onClick={reset}>↻ Nouveau tirage</button>
    </StudioRound>
  );
};

export default LetterRound;
