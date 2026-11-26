import { useTranslation } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import { useGameLanguage } from '../i18n';
import { useNavigate } from 'react-router-dom';
import InteractiveTiles from '../components/InteractiveTiles';
import NumberTileBuilder from '../components/NumberTileBuilder';
import RiveGameBoard, { BoardAction } from '../components/RiveGameBoard';
import { useRiveClock } from '../components/useRiveClock';
import {
  createDuelDraw, createFinaleDraw, DuelKind, DuelRound, FinaleRound,
  fetchDuelSolution, fetchFinaleSolutions, fetchLettersDraw, fetchLettersSolutions,
  fetchNumbersDraw, fetchNumbersSolutions, LetterKind, LettersDraw, NumbersDraw,
  skipFinaleWord, validateDuelAnswer, validateFinaleWord, validateLettersWord,
  validateNumbersAnswer, WordLanguage
} from '../services/gameService';

type Mode = 'letters' | 'numbers' | 'duel' | 'final';
type Round =
  | { mode: 'letters'; draw: LettersDraw }
  | { mode: 'numbers'; draw: NumbersDraw }
  | { mode: 'duel'; draw: DuelRound }
  | { mode: 'final'; draw: FinaleRound };

const LANGUAGE_NAMES: Record<WordLanguage, string> = { fr: 'Français', pt: 'Português', en: 'English' };
const BALANCED_DRAW: LetterKind[] = Array.from({ length: 10 }, (_, i) => i % 2 ? 'consonant' : 'vowel');

const RiveRound: React.FC<{ mode: Mode }> = ({ mode }) => {
  const t = useTranslation();
  const MODE_NAMES = { letters: t('Le mot le plus long','Longest word','A palavra mais longa'), numbers: t('Le compte est bon','Numbers challenge','Desafio dos números'), duel: t('Les duels','Duels','Duelos'), final: t('Les mots de la fin','Final words','Palavras finais') };
  const navigate = useNavigate();
  const [round, setRound] = useState<Round | null>(null);
  const language = useGameLanguage();
  const [largeCount, setLargeCount] = useState(2);
  const [kind, setKind] = useState<DuelKind>('anagram');
  const [choices, setChoices] = useState<LetterKind[]>([]);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState('');
  const [finished, setFinished] = useState(false);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const seconds = useRiveClock(round?.draw.deadlineAt);
  const playing = !!round && !finished && seconds > 0;
  const numeric = mode === 'numbers' || (mode === 'duel' && kind === 'mental');

  const run = async (operation: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await operation();
    } catch {
      setFeedback(t("Action indisponible. Réessayez ou consultez le résultat.", "Action unavailable. Try again or check the result.", "Ação indisponível. Tente novamente ou consulte o resultado."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const reset = () => {
    setRound(null);
    setChoices([]);
    setAnswer('');
    setFeedback('');
    setScore(0);
    setRevealed('');
    setFinished(false);
  };

  const choose = (choice: LetterKind) => {
    setChoices(previous => previous.length < 10 ? [...previous, choice] : [choice]);
  };

  const start = () => run(async () => {
    let started: Round;
    switch (mode) {
      case 'letters':
        started = { mode, draw: await fetchLettersDraw(choices.length === 10 ? choices : BALANCED_DRAW, language) };
        break;
      case 'numbers':
        started = { mode, draw: await fetchNumbersDraw(largeCount) };
        break;
      case 'duel':
        started = { mode, draw: await createDuelDraw(kind, language) };
        break;
      case 'final':
        started = { mode, draw: await createFinaleDraw(language) };
        break;
    }
    setRound(started);
    setFeedback('');
    setAnswer('');
  });

  const submit = () => {
    if (!round || !playing || !answer.trim()) return;
    void run(async () => {
      if (round.mode === 'final') {
        const result = await validateFinaleWord(round.draw.drawId, round.draw.currentIndex, answer);
        if (!result.valid) {
          setFeedback(t("Mot refusé. Essayez un autre anagramme.", "Word rejected. Try another anagram.", "Palavra recusada. Tente outro anagrama."));
          return;
        }
        setRound({ mode: 'final', draw: result.round });
        setScore(result.round.score);
        setFinished(result.finished);
        setAnswer('');
        setFeedback(t("Mot accepté.", "Word accepted.", "Palavra aceite."));
        return;
      }

      const result = round.mode === 'letters' ? await validateLettersWord(round.draw.drawId, answer) :
        round.mode === 'numbers' ? await validateNumbersAnswer(round.draw.drawId, answer) :
          await validateDuelAnswer(round.draw.drawId, answer);
      if (!result.valid) {
        setFeedback(t("Proposition refusée. Essayez une autre réponse.", "Answer rejected. Try another answer.", "Resposta recusada. Tente outra resposta."));
        return;
      }
      setScore(result.score);
      setFinished(true);
      setFeedback(t(`Réponse acceptée : ${result.score} points.`, `Answer accepted: ${result.score} points.`, `Resposta aceite: ${result.score} pontos.`));
    });
  };

  const solution = () => {
    if (!round || playing) return;
    void run(async () => {
      const id = round.draw.drawId;
      let result: string;
      switch (round.mode) {
        case 'letters':
          result = (await fetchLettersSolutions(id)).bestWords.slice(0, 5).join(' · ');
          break;
        case 'numbers': {
          const { solution: calculation } = await fetchNumbersSolutions(id);
          result = `${calculation.expression} = ${calculation.value}`;
          break;
        }
        case 'duel':
          result = (await fetchDuelSolution(id)).answer;
          break;
        case 'final':
          result = (await fetchFinaleSolutions(id)).words.map(item => item.target).join(' · ');
          break;
      }
      setRevealed(result);
    });
  };

  const skip = () => {
    if (round?.mode !== 'final' || !playing) return;
    void run(async () => {
      const updated = await skipFinaleWord(round.draw.drawId, round.draw.currentIndex);
      setRound({ mode: 'final', draw: updated });
      setFinished(updated.finished);
      setScore(updated.score);
      setAnswer('');
      setFeedback(t("Tirage passé.", "Draw skipped.", "Sorteio ignorado."));
    });
  };

  useEffect(() => {
    if (round && !finished && seconds === 0) setFeedback(t("Temps écoulé.", "Time is up.", "Tempo esgotado."));
  }, [round, finished, seconds, t]);

  const action = (name: BoardAction) => {
    if (pending.current) return;
    if (name === 'reset') {
      reset();
      return;
    }
    if (name === 'primary') {
      if (!round) void start();
      else if (playing) submit();
      else reset();
    } else if (name === 'secondary') {
      if (!round && mode === 'letters') choose('vowel');
      else if (!round && mode === 'numbers') setLargeCount(previous => (previous + 1) % 5);
      else if (!round && mode === 'duel') setKind(previous => previous === 'mental' ? 'anagram' : 'mental');
      else if (playing && mode === 'final') skip();
      else solution();
    } else if (name === 'auxiliary' && !round && mode === 'letters') {
      choose('consonant');

    } else if (name === 'backspace') {
      if (playing) setAnswer(previous => previous.slice(0, -1));
      else if (!round && mode === 'letters') setChoices(previous => previous.slice(0, -1));
    }
  };

  let tiles: (string | number)[] = [];
  let caption = mode === 'letters' ? `${LANGUAGE_NAMES[language]} · ${choices.length} / 10 choix · Tirage automatique par défaut`
    : mode === 'numbers' ? `${largeCount} grandes plaques · Atteignez le nombre cible.`
    : mode === 'duel' ? `${kind === 'anagram' ? 'Anagramme' : 'Calcul mental'} · ${LANGUAGE_NAMES[language]}`
    : `${LANGUAGE_NAMES[language]} · Huit anagrammes en deux minutes.`;

  if (round?.mode === 'letters') {
    tiles = round.draw.letters;
    caption = t(`Composez un mot en ${LANGUAGE_NAMES[language]}.`, `Build a word in ${LANGUAGE_NAMES[language]}.`, `Componha uma palavra em ${LANGUAGE_NAMES[language]}.`);
  } else if (round?.mode === 'numbers') {
    tiles = round.draw.numbers;
    caption = t(`Cible : ${round.draw.targetNumber} · Saisissez un calcul.`, `Target: ${round.draw.targetNumber} · Enter a calculation.`, `Alvo: ${round.draw.targetNumber} · Introduza um cálculo.`);
  } else if (round?.mode === 'duel') {
    tiles = round.draw.letters ?? [];
    caption = round.draw.kind === 'mental' ? round.draw.challenge : t("Retrouvez le mot de l’anagramme.", "Find the anagram word.", "Encontre a palavra do anagrama.");
  } else if (round?.mode === 'final') {
    tiles = round.draw.current?.letters ?? [];
    caption = `Mot ${Math.min(round.draw.currentIndex + 1, round.draw.totalItems)} / ${round.draw.totalItems}`;
  } else if (mode === 'letters') {
    tiles = choices.map(choice => choice === 'vowel' ? 'V' : 'C');
  }

  return <div className="rive-interactive-board"><RiveGameBoard
    text={{
      heading: MODE_NAMES[mode],
      progress: t("ENTRAÎNEMENT", "PRACTICE", "TREINO"),
      caption,
      clock: round ? `${seconds} s` : '—',
      score: t(`${score} points`, `${score} points`, `${score} pontos`),
      answer: answer || (playing ? numeric ? t("Votre calcul…", "Your calculation…", "O seu cálculo…") : t("Votre mot…", "Your word…", "A sua palavra…") : ''),
      feedback: busy ? t("Veuillez patienter…", "Please wait…", "Aguarde…") : [feedback, revealed].filter(Boolean).join('\n'),
      primaryLabel: !round ? t("Tirer", "Draw", "Sortear") : playing ? t("Valider", "Submit", "Validar") : t("Nouveau tirage", "New draw", "Novo sorteio"),
      secondaryLabel: !round ? { letters: t("Voyelle", "Vowel", "Vogal"), numbers: t("Nombre de grandes", "Large tiles", "Peças grandes"), duel: t("Type de duel", "Duel type", "Tipo de duelo"), final: '' }[mode] :
        playing ? mode === 'final' ? t("Passer ce mot", "Skip word", "Ignorar palavra") : '' : t("Voir la solution", "Show solution", "Ver solução"),
      auxiliaryLabel: !round && mode === 'letters' ? t("Consonne", "Consonant", "Consoante") : '',
      backspaceLabel: playing || (!round && mode === 'letters') ? t("Effacer", "Delete", "Apagar") : '',
      refreshLabel: '',
      resetLabel: round ? t("Quitter", "Quit", "Sair") : t("Menu", "Menu", "Menu")
    }}
    tiles={tiles}
    keyboardVisible={playing}
    revealKey={round ? `${round.draw.drawId}:${round.mode === 'final' ? round.draw.currentIndex : 0}` : undefined}
    onAction={name => {
      if (name === 'reset' && !round && !pending.current) navigate('/rive');
      else action(name);
    }}
    onKey={key => {
      if (playing && !pending.current && (numeric ? /^[0-9+*/() -]$/ : /^\p{L}$/u).test(key)) {
        setAnswer(previous => (previous + key).slice(0, mode === 'numbers' ? 180 : 40));
      }
    }}
  />
    {playing && round && <div style={{maxWidth:600,margin:'0 auto',padding:12}}>
      {round.mode === 'numbers' ? <NumberTileBuilder key={round.draw.drawId} numbers={round.draw.numbers} disabled={busy} onCompose={setAnswer} /> :
        !numeric && <InteractiveTiles key={`${round.draw.drawId}:${round.mode === 'final' ? round.draw.currentIndex : 0}`} tiles={tiles} disabled={busy} onCompose={values => setAnswer(values.join(''))} />}
      {!numeric || round.mode === 'numbers' ? <button type="button" className="button button--primary" disabled={busy || !answer.trim()} onClick={submit}>{t('Valider','Submit','Validar')}</button> : null}
    </div>}
  </div>;
};

export default RiveRound;
