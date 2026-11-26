import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation, useGameLanguage } from '../i18n';
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
  pt: 'Português'
};

const LetterRound: React.FC = () => {
  const t = useTranslation();
  const globalLanguage = useGameLanguage();
  const [drawLanguage, setDrawLanguage] = useState<WordLanguage>(globalLanguage);
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
  const language = phase === 'select' ? globalLanguage : drawLanguage;
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
    setDrawLanguage(globalLanguage);
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
    select: t("Choisissez dix fois Voyelle ou Consonne, puis lancez le tirage.","Choose vowel or consonant ten times, then start the draw.","Escolha dez vezes vogal ou consoante e inicie o sorteio."),
    loading: t("Le serveur prépare votre tirage…","The server is preparing your draw…","O servidor está a preparar o sorteio…"),
    revealing: `Révélation des lettres : ${visibleLetters} / ${LETTER_COUNT}`,
    playing: t("Le chrono tourne ! Composez votre mot.","The clock is running! Build your word.","O tempo está a contar! Componha a palavra."),
    checking: t("Le lexique vérifie votre proposition…","Checking your word against the dictionary…","A verificar a palavra no dicionário…"),
    finished: t("La ronde est terminée.","The round is over.","A ronda terminou.")
  }[phase];

  return (
    <StudioRound number="01" title={t("Le mot le plus long","Longest word","Palavra mais longa")}
      animationCue={validated ? 'success' : 'draw'} animationRevision={round}
      description={t("Choisissez la langue et les lettres, puis trouvez le plus long mot possible.","Choose the language and letters, then find the longest word possible.","Escolha o idioma e as letras e encontre a palavra mais longa possível.")}
      aside={<>
        <CountdownClock seconds={ROUND_SECONDS} resetKey={round}
          running={phase === 'playing'} onExpire={expire} />
        <p className="aside-note">{t("Le chronomètre commence après la dernière lettre. Le serveur vérifie également le délai.","The timer starts after the last letter. The server also checks the deadline.","O cronómetro começa após a última letra. O servidor também verifica o prazo.")}</p>
      </>}>
      

      <div className="puzzle-label">{t("VOTRE TIRAGE DE DIX LETTRES","YOUR TEN LETTERS","AS SUAS DEZ LETRAS")}</div>
      <TileRack tiles={letters} variant="letters" totalSlots={LETTER_COUNT} revealedCount={visibleLetters} />
      <p className="letter-status" role="status">{status}</p>

      {phase === 'select' && <>
        <div className="letter-choices-header">
          <strong>{t("Composez votre tirage","Choose your draw","Componha o sorteio")}</strong>
          <span>{choices.length} / {LETTER_COUNT} choix</span>
        </div>
        <div className="letter-choice-history" aria-label="Choix effectués">
          {choices.map((kind, index) => (
            <span key={index} className={`choice-chip choice-chip--${kind}`}
              aria-label={kind === 'vowel' ? t("Voyelle","Vowel","Vogal") : t("Consonne","Consonant","Consoante")}>
              {kind === 'vowel' ? 'V' : 'C'}
            </span>
          ))}
        </div>
        <div className="letter-choice-controls">
          <button type="button" className="button button--outline" disabled={choices.length >= LETTER_COUNT}
            onClick={() => choose('vowel')}>{t("Voyelle","Vowel","Vogal")}</button>
          <button type="button" className="button button--outline" disabled={choices.length >= LETTER_COUNT}
            onClick={() => choose('consonant')}>{t("Consonne","Consonant","Consoante")}</button>
          <button type="button" className="text-button" onClick={() => setChoices(current => current.slice(0, -1))}
            disabled={choices.length === 0}>{t("Annuler un choix","Undo choice","Desfazer escolha")}</button>
        </div>
        <div className="letter-draw-controls">
          <button className="button button--primary" type="button" onClick={() => void beginDraw()}
            disabled={choices.length !== LETTER_COUNT}>{t("Lancer le tirage","Start draw","Iniciar sorteio")}</button>
          <button className="text-button" type="button" onClick={autoChoose}>{t("Tirage automatique (5 V / 5 C)","Automatic draw (5 V / 5 C)","Sorteio automático (5 V / 5 C)")}</button>
        </div>
      </>}

      {(phase === 'playing' || phase === 'checking' || phase === 'finished') && <>
        <InteractiveTiles key={drawId} tiles={letters} disabled={phase !== 'playing'} onCompose={values => setWord(values.join(''))} />
        <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="letter-answer">{t('Votre mot en','Your word in','A sua palavra em')} {languageLabel[language]}</label>
          <div className="answer-row">
            <input id="letter-answer" value={word} onChange={event => setWord(event.target.value)}
              placeholder={t("Composez votre mot…","Build your word…","Componha a sua palavra…")} autoComplete="off"
              maxLength={LETTER_COUNT} disabled={phase !== 'playing'} required />
            <button className="button button--primary" type="submit" disabled={phase !== 'playing'}>
              {phase === 'checking' ? t("Vérification…","Checking…","A verificar…") : t("Valider","Submit","Validar")}
            </button>
          </div>
        </form>
      </>}

      {feedback && <p className={`answer-feedback ${validated ? 'answer-feedback--success' : ''}`} role="status">{feedback}</p>}

      {phase === 'finished' && <section className="letter-results" aria-label="Résultat de la ronde">
        <h2>{t("Résultat du tirage","Round result","Resultado da ronda")}</h2>
        <p className="letter-score">Votre score : <strong>{score} points</strong></p>
        {solutions ? <>
          <p>{t('Meilleure longueur du lexique local :','Longest word in the local dictionary:','Maior comprimento no dicionário local:')} <strong>{solutions.bestLength} lettres</strong></p>
          <p className="letter-solutions-label">{t("Exemples de mots trouvés :","Examples of words found:","Exemplos de palavras encontradas:")}</p>
          {solutions.bestWords.length
            ? <div className="letter-solution-list">{solutions.bestWords.map(item => <span key={item}>{item}</span>)}</div>
            : <p>{t("Aucun mot répertorié pour ce tirage.","No words found for this draw.","Nenhuma palavra encontrada neste sorteio.")}</p>}
          <p className="letter-data-note">Solutions limitées aux {solutions.lexiconEntries.toLocaleString('fr')} mots du lexique local provisoire. Le barème appliqué est d'un point par lettre.</p>
        </> : <p className="letter-data-note">{t("Chargement des solutions…","Loading solutions…","A carregar soluções…")}</p>}
      </section>}

      <button type="button" className="text-button" onClick={reset}>{t("↻ Nouveau tirage","↻ New draw","↻ Novo sorteio")}</button>
    </StudioRound>
  );
};

export default LetterRound;
