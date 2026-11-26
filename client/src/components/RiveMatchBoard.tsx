import { useTranslation } from '../i18n';
import React, { useEffect } from 'react';
import InteractiveTiles from './InteractiveTiles';
import NumberTileBuilder from './NumberTileBuilder';
import RiveGameBoard, { BoardAction } from './RiveGameBoard';
import { useNavigate } from 'react-router-dom';
import { useRiveClock } from './useRiveClock';
import { SoloMatch, WordLanguage } from '../services/gameService';

const LANGUAGE_NAMES: Record<WordLanguage, string> = { fr: 'Français', pt: 'Português', en: 'English' };

interface Props {
  match: SoloMatch | null;
  language: WordLanguage;
  largeCount: number;
  answer: string;
  feedback: string;
  solution: string;
  busy: boolean;
  restoring: boolean;
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
  onLargeCount, onAnswer, onStart, onSubmit, onSkip, onNext, onReset, onRefresh
}) => {
  const t = useTranslation();
  const ROUND_NAMES = { letters: t('Le mot le plus long','Longest word','A palavra mais longa'), numbers: t('Le compte est bon','Numbers challenge','Desafio dos números'), duel: t('Les duels','Duels','Duelos'), final: t('Les mots de la fin','Final words','Palavras finais') };
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
        if (playing && round?.kind === 'final') onSkip();
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

  let caption = t("Neuf épreuves, du premier tirage à la finale.", "Nine rounds, from the first draw to the final.", "Nove provas, do primeiro sorteio à final.");
  if (round?.kind === 'letters') caption = t(`Composez un mot en ${LANGUAGE_NAMES[match?.language ?? language]}.`, `Build a word in ${LANGUAGE_NAMES[match?.language ?? language]}.`, `Componha uma palavra em ${LANGUAGE_NAMES[match?.language ?? language]}.`);
  if (round?.kind === 'numbers') caption = t(`Cible : ${round.targetNumber}     ·     Saisissez un calcul.`, `Target: ${round.targetNumber} · Enter a calculation.`, `Alvo: ${round.targetNumber} · Introduza um cálculo.`);
  if (round?.kind === 'duel') caption = round.duelKind === 'mental' ? round.challenge ?? '' : t("Retrouvez le mot de l’anagramme.", "Find the anagram word.", "Encontre a palavra do anagrama.");
  if (round?.kind === 'final') caption = `Mot ${(round.finaleIndex ?? 0) + 1} / ${round.finaleTotal ?? 8}     ·     ${round.finaleScore ?? 0} points en finale`;

  return <div className="rive-interactive-board"><RiveGameBoard
    text={{
      heading: match?.status === 'finished' ? t("Résultat final", "Final result", "Resultado final") : round ? ROUND_NAMES[round.kind] : t("La partie solo", "Solo match", "Partida individual"),
      progress: match ? `${Math.min(match.currentIndex + 1, match.totalRounds)} / ${match.totalRounds}` : t("PARTIE SOLO", "SOLO MATCH", "PARTIDA INDIVIDUAL"),
      caption,
      clock: deadline ? `${remaining} s` : '—',
      score: t(`${match?.totalScore ?? 0} points`, `${match?.totalScore ?? 0} points`, `${match?.totalScore ?? 0} pontos`),
      answer: answer || (playing ? numeric ? t("Votre calcul…", "Your calculation…", "O seu cálculo…") : t("Votre mot…", "Your word…", "A sua palavra…") : ''),
      feedback: restoring ? t("Récupération de votre partie…", "Restoring your match…", "A recuperar a partida…") : busy ? t("Veuillez patienter…", "Please wait…", "Aguarde…") : [feedback, solution].filter(Boolean).join('\n'),
      primaryLabel: !match ? t("Commencer", "Start", "Começar") : match.status === 'review' ? t("Épreuve suivante", "Next round", "Próxima prova") : match.status === 'finished' ? t("Nouvelle partie", "New match", "Nova partida") : t("Valider", "Submit", "Validar"),
      secondaryLabel: playing && round?.kind === 'final' ? t("Passer ce mot", "Skip word", "Ignorar palavra") : '',
      auxiliaryLabel: !match ? t(`${largeCount} grandes`, `${largeCount} large tiles`, `${largeCount} peças grandes`) : '',
      backspaceLabel: playing ? t("Effacer", "Delete", "Apagar") : '',
      refreshLabel: match ? t("Actualiser", "Refresh", "Atualizar") : '',
      resetLabel: match ? t("Quitter", "Quit", "Sair") : t("Menu", "Menu", "Menu")
    }}
    keyboardVisible={playing}
    revealKey={round ? `${round.drawId}:${round.finaleIndex ?? 0}` : undefined}
    tiles={round?.letters ?? round?.numbers ?? []}
    onAction={action}
    onKey={type}
  />
    {playing && round && <div style={{maxWidth:600,margin:'0 auto',padding:12}}>
      {round.kind === 'numbers' ? <NumberTileBuilder key={round.drawId} numbers={round.numbers ?? []} disabled={busy} onCompose={onAnswer} /> :
        !numeric && <InteractiveTiles key={`${round.drawId}:${round.finaleIndex ?? 0}`} tiles={round.letters ?? []} disabled={busy} onCompose={values => onAnswer(values.join(''))} />}
      {!numeric || round.kind === 'numbers' ? <button type="button" className="button button--primary" disabled={busy || !answer.trim()} onClick={onSubmit}>{t('Valider','Submit','Validar')}</button> : null}
    </div>}
  </div>;
};

export default RiveMatchBoard;
