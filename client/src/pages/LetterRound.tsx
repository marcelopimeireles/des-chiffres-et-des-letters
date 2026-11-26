import React, { useCallback, useEffect, useRef, useState } from 'react';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import InteractiveTiles from '../components/InteractiveTiles';
import {
  fetchLettersDraw, fetchLettersSolutions, LetterKind, LetterSolutions,
  WordLanguage, validateLettersWord, WordValidationReason
} from '../services/gameService';
import { canMakeWord } from '../utils/numbers';

type RoundPhase = 'select' | 'loading' | 'revealing' | 'playing' | 'checking' | 'finished';
const LETTER_COUNT = 10;
const ROUND_SECONDS = 30;
const REVEAL_DELAY_MS = 230;

const VALIDATION_MESSAGES: Record<WordValidationReason, string> = {
  accepted: 'Mot reconnu dans le lexique local.',
  not_in_dictionary: 'Mot absent du lexique local de cette langue.',
  letters_mismatch: 'Ce mot ne peut pas être composé avec les lettres tirées.',
  invalid_format: 'Seuls les mots simples de 1 à 10 lettres sont acceptés.'
};

const languageLabel: Record<WordLanguage, string> = {
  fr: 'Français',
  en: 'English',
  pt: 'Português (Portugal)'
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
  const [score, setScore] = useState(0);
  const [solutions, setSolutions] = useState<LetterSolutions | null>(null);
  const [phase, setPhase] = useState<RoundPhase>('select');
  const [round, setRound] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    return () => { requestRef.current += 1; };
  }, []);

  const loadSolutions = useCallback(async (id: string, revision: number) => {
    try {
      const result = await fetchLettersSolutions(id);
      if (revision === requestRef.current) {
        setSolutions(result);
        setScore(result.score ?? 0);
      }
    } catch {
      if (revision === requestRef.current) {
        setFeedback('Ronde terminée. Les solutions ne sont pas disponibles pour ce tirage.');
      }
    }
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
    const revision = ++requestRef.current;
    setPhase('loading');
    setFeedback('');
    setValidated(false);
    setScore(0);
    setSolutions(null);
    setDrawId('');
    setLetters([]);
    setVisibleLetters(0);
    setWord('');
    try {
      const data = await fetchLettersDraw(choices, language);
      if (revision !== requestRef.current) return;
      if (!Array.isArray(data.letters) || data.letters.length !== LETTER_COUNT ||
          typeof data.drawId !== 'string' || data.language !== language) {
        throw new Error('Tirage incomplet.');
      }
      setLetters(data.letters);
      setDrawId(data.drawId);
      setRound(current => current + 1);
      setPhase('revealing');
    } catch {
      if (revision !== requestRef.current) return;
      setFeedback('Impossible de tirer les lettres. Vérifiez que le serveur et les lexiques sont disponibles.');
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
    if (drawId) void loadSolutions(drawId, requestRef.current);
  }, [drawId, loadSolutions]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== 'playing' || !drawId) return;
    if (!canMakeWord(word, letters)) {
      setFeedback('Ce mot ne peut pas être composé avec les lettres tirées.');
      return;
    }
    const revision = ++requestRef.current;
    setPhase('checking');
    setFeedback('Vérification dans le lexique local…');
    try {
      const result = await validateLettersWord(drawId, word);
      if (revision !== requestRef.current) return;
      if (result.language !== language) throw new Error('Language mismatch');
      if (result.valid) {
        setValidated(true);
        setScore(result.score);
        setSolutions(result.solutions || null);
        setPhase('finished');
        setFeedback(`« ${result.word?.toLocaleUpperCase() || word.toLocaleUpperCase()} » — ${VALIDATION_MESSAGES.accepted} Vous marquez ${result.score} points.`);
      } else {
        setFeedback(VALIDATION_MESSAGES[result.reason] || 'Mot refusé.');
        setPhase('playing');
      }
    } catch (error) {
      if (revision !== requestRef.current) return;
      const status = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 409 || status === 404) {
        setPhase('finished');
        setFeedback('Le temps est écoulé, ou cette ronde est déjà terminée.');
        void loadSolutions(drawId, revision);
      } else {
        setFeedback('Impossible de vérifier ce mot. Réessayez.');
        setPhase('playing');
      }
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
    setScore(0);
    setSolutions(null);
  };

  const status = {
    select: 'Choisissez dix fois Voyelle ou Consonne, puis lancez le tirage.',
    loading: 'Le serveur prépare votre tirage…',
    revealing: `Révélation des lettres : ${visibleLetters} / ${LETTER_COUNT}`,
    playing: 'Le chrono tourne ! Composez votre mot.',
    checking: 'Le lexique vérifie votre proposition…',
    finished: 'La ronde est terminée.'
  }[phase];

  return (
    <StudioRound number="01" title="Le mot le plus long"
      animationCue={validated ? 'success' : 'draw'} animationRevision={round}
      description="Choisissez la langue et les lettres, puis trouvez le plus long mot possible."
      aside={<>
        <CountdownClock seconds={ROUND_SECONDS} resetKey={round}
          running={phase === 'playing'} onExpire={expire} />
        <p className="aside-note">Le chronomètre commence après la dernière lettre. Le serveur vérifie également le délai.</p>
      </>}>
      <div className="language-selector">
        <label htmlFor="word-language">Langue du dictionnaire</label>
        <select id="word-language" value={language} disabled={phase !== 'select'}
          onChange={event => setLanguage(event.target.value as WordLanguage)}>
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="pt">Português (Portugal)</option>
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
            <span key={index} className={`choice-chip choice-chip--${kind}`}
              aria-label={kind === 'vowel' ? 'Voyelle' : 'Consonne'}>
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
        <InteractiveTiles key={drawId} tiles={letters} disabled={phase !== 'playing'} onCompose={values => setWord(values.join(''))} />
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

      {phase === 'finished' && <section className="letter-results" aria-label="Résultat de la ronde">
        <h2>Résultat du tirage</h2>
        <p className="letter-score">Votre score : <strong>{score} points</strong></p>
        {solutions ? <>
          <p>Meilleure longueur du lexique local : <strong>{solutions.bestLength} lettres</strong></p>
          <p className="letter-solutions-label">Exemples de mots trouvés :</p>
          {solutions.bestWords.length
            ? <div className="letter-solution-list">{solutions.bestWords.map(item => <span key={item}>{item}</span>)}</div>
            : <p>Aucun mot répertorié pour ce tirage.</p>}
          <p className="letter-data-note">Solutions limitées aux {solutions.lexiconEntries.toLocaleString('fr')} mots du lexique local provisoire. Le barème appliqué est d'un point par lettre.</p>
        </> : <p className="letter-data-note">Chargement des solutions…</p>}
      </section>}

      <button type="button" className="text-button" onClick={reset}>↻ Nouveau tirage</button>
    </StudioRound>
  );
};

export default LetterRound;
