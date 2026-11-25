import React, { useEffect } from 'react';
import RiveGameBoard, { BoardAction } from './RiveGameBoard';
import { useNavigate } from 'react-router-dom';
import { useRiveClock } from './useRiveClock';
import { SoloMatch, WordLanguage } from '../services/gameService';

const LANGUAGES: WordLanguage[] = ['fr', 'pt', 'en'];
const LANGUAGE_NAMES: Record<WordLanguage, string> = { fr: 'Français', pt: 'Português', en: 'English' };
const ROUND_NAMES = {
  letters: 'Le mot le plus long',
  numbers: 'Le compte est bon',
  duel: 'Les duels',
  final: 'Les mots de la fin'
};

interface Props {
  match: SoloMatch | null;
  language: WordLanguage;
  largeCount: number;
  answer: string;
  feedback: string;
  solution: string;
  busy: boolean;
  restoring: boolean;
  onLanguage: (language: WordLanguage) => void;
  onLargeCount: (count: number) => void;
  onAnswer: (answer: string | ((previous: string) => string)) => void;
  onStart: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  onNext: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

const RiveMatchBoard: React.FC<Props> = ({
  match, language, largeCount, answer, feedback, solution, busy, restoring,
  onLanguage, onLargeCount, onAnswer, onStart, onSubmit, onSkip, onNext, onReset, onRefresh
}) => {
  const navigate = useNavigate();
  const round = match?.current;
  const deadline = match?.status === 'playing' ? round?.deadlineAt : undefined;
  const remaining = useRiveClock(deadline);
  const playing = match?.status === 'playing' && !!round && remaining > 0;
  const numeric = round?.kind === 'numbers' || (round?.kind === 'duel' && round.duelKind === 'mental');

  useEffect(() => {
    if (deadline && remaining === 0) onRefresh();
    // One automatic refresh per expired deadline; the board also has a manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, remaining]);

  const action = (name: BoardAction) => {
    if (restoring || busy) return;
    switch (name) {
      case 'primary':
        if (!match) onStart();
        else if (match.status === 'finished') onReset();
        else if (match.status === 'review') onNext();
        else if (playing) onSubmit();
        break;
      case 'secondary':
        if (!match) onLanguage(LANGUAGES[(LANGUAGES.indexOf(language) + 1) % LANGUAGES.length]);
        else if (playing && round?.kind === 'final') onSkip();
        break;
      case 'auxiliary':
        if (!match) onLargeCount((largeCount + 1) % 5);
        break;
      case 'backspace':
        if (playing) onAnswer(previous => previous.slice(0, -1));
        break;
      case 'refresh':
        if (match) onRefresh();
        break;
      case 'reset':
        if (match) onReset();
        else navigate('/rive');
        break;
    }
  };

  const type = (key: string) => {
    if (!playing || busy) return;
    if (!(numeric ? /^[0-9+*/() -]$/ : /^\p{L}$/u).test(key)) return;
    const limit = round.kind === 'numbers' ? 180 : 40;
    onAnswer(previous => (previous + key).slice(0, limit));
  };

  let caption = 'Neuf épreuves, du premier tirage à la finale.';
  if (round?.kind === 'letters') caption = `Composez un mot en ${LANGUAGE_NAMES[match?.language ?? language]}.`;
  if (round?.kind === 'numbers') caption = `Cible : ${round.targetNumber}     ·     Saisissez un calcul.`;
  if (round?.kind === 'duel') caption = round.duelKind === 'mental' ? round.challenge ?? '' : 'Retrouvez le mot de l’anagramme.';
  if (round?.kind === 'final') caption = `Mot ${(round.finaleIndex ?? 0) + 1} / ${round.finaleTotal ?? 8}     ·     ${round.finaleScore ?? 0} points en finale`;

  return <RiveGameBoard
    text={{
      heading: match?.status === 'finished' ? 'Résultat final' : round ? ROUND_NAMES[round.kind] : 'La partie solo',
      progress: match ? `${Math.min(match.currentIndex + 1, match.totalRounds)} / ${match.totalRounds}` : 'PARTIE SOLO',
      caption,
      clock: deadline ? `${remaining} s` : '—',
      score: `${match?.totalScore ?? 0} points`,
      answer: answer || (playing ? numeric ? 'Votre calcul…' : 'Votre mot…' : ''),
      feedback: restoring ? 'Récupération de votre partie…' : busy ? 'Veuillez patienter…' : [feedback, solution].filter(Boolean).join('\n'),
      primaryLabel: !match ? 'Commencer' : match.status === 'review' ? 'Épreuve suivante' : match.status === 'finished' ? 'Nouvelle partie' : 'Valider',
      secondaryLabel: !match ? LANGUAGE_NAMES[language] : playing && round?.kind === 'final' ? 'Passer ce mot' : '',
      auxiliaryLabel: !match ? `${largeCount} grandes` : '',
      backspaceLabel: playing ? 'Effacer' : '',
      refreshLabel: match ? 'Actualiser' : '',
      resetLabel: match ? 'Quitter' : 'Menu'
    }}
    keyboardVisible={playing}
    revealKey={round ? `${round.drawId}:${round.finaleIndex ?? 0}` : undefined}
    tiles={round?.letters ?? round?.numbers ?? []}
    onAction={action}
    onKey={type}
  />;
};

export default RiveMatchBoard;
