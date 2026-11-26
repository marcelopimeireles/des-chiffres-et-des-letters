import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import DeadlineClock from '../components/DeadlineClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import {
  createFinaleDraw, fetchFinaleDraw, fetchFinaleSolutions,
  skipFinaleWord, validateFinaleWord, FinaleRound, FinaleSolutions, WordLanguage
} from '../services/gameService';

const FinalWords: React.FC = () => {
  const t = useTranslation();
  const [language, setLanguage] = useState<WordLanguage>('fr');
  const [round, setRound] = useState<FinaleRound | null>(null);
  const [answers, setAnswers] = useState<FinaleSolutions | null>(null);
  const [word, setWord] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async (id: string) => {
    try { setRound(await fetchFinaleDraw(id)); }
    catch { setFeedback(t("Impossible de récupérer la finale.", "Unable to retrieve the final.", "Não foi possível recuperar a final.")); }
  };

  useEffect(() => {
    if (!round?.finished || answers) return;
    let active = true;
    fetchFinaleSolutions(round.drawId).then(data => {
      if (active) setAnswers(data);
    }).catch(() => {});
    return () => { active = false; };
  }, [round?.drawId, round?.finished, answers]);

  const start = async () => {
    if (busy) return;
    setBusy(true); setAnswers(null); setWord(''); setFeedback('');
    try { setRound(await createFinaleDraw(language)); }
    catch { setFeedback(t("Impossible de démarrer la finale.", "Unable to start the final.", "Não foi possível iniciar a final.")); }
    finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!round?.current || round.finished || busy) return;
    setBusy(true);
    try {
      const response = await validateFinaleWord(round.drawId, round.current.index, word);
      if (response.valid) {
        setRound(response.round);
        setWord('');
        setFeedback(t("Mot accepté : 10 points.", "Word accepted: 10 points.", "Palavra aceite: 10 pontos."));
      } else {
        setFeedback(response.reason === 'not_in_dictionary' ? t("Mot absent du lexique.", "Word not in dictionary.", "Palavra ausente do dicionário.")
          : response.reason === 'letters_mismatch' ? t("Ces lettres ne permettent pas ce mot.", "These letters cannot form this word.", "Estas letras não permitem formar esta palavra.")
            : t("Saisissez un mot de dix lettres.", "Enter a ten-letter word.", "Introduza uma palavra de dez letras."));
      }
    } catch {
      await refresh(round.drawId);
      setFeedback(t("Le temps est écoulé ou la proposition a été refusée.", "Time expired or the answer was rejected.", "O tempo terminou ou a resposta foi rejeitada."));
    } finally { setBusy(false); }
  };

  const skip = async () => {
    if (!round?.current || round.finished || busy) return;
    setBusy(true);
    try {
      const result = await skipFinaleWord(round.drawId, round.current.index);
      setRound(result); setWord(''); setFeedback(t("Mot passé : 0 point.", "Word skipped: 0 points.", "Palavra ignorada: 0 pontos."));
    } catch {
      await refresh(round.drawId);
      setFeedback(t("Impossible de passer ce tirage.", "Unable to skip this draw.", "Não foi possível saltar este sorteio."));
    } finally { setBusy(false); }
  };

  return (
    <StudioRound number="04" title={t("Les mots de la fin", "Final words", "Palavras finais")}
      animationCue={round?.finished && round.score > 0 ? 'success' : 'draw'}
      description={t("Huit anagrammes de dix lettres, deux minutes globales. 10 points par mot validé.", "Eight ten-letter anagrams, two minutes total. 10 points per accepted word.", "Oito anagramas de dez letras, dois minutos no total. 10 pontos por palavra aceite.")}
      aside={round && <><DeadlineClock deadlineAt={round.deadlineAt} totalSeconds={120}
        running={!round.finished} onExpire={() => void refresh(round.drawId)} />
        <p className="aside-note">{t("Le temps continue entre les huit tirages et après un rechargement.", "The timer continues between all eight draws and after reloading.", "O tempo continua entre os oito sorteios e após recarregar a página.")}</p></>}>
      {!round && <section className="challenge-setup">
        <label htmlFor="final-language">{t("Langue du lexique", "Dictionary language", "Idioma do dicionário")}
          <select id="final-language" value={language}
            onChange={event => setLanguage(event.target.value as WordLanguage)}>
            <option value="fr">Français</option><option value="pt">Português (Portugal)</option>
            <option value="en">English</option>
          </select>
        </label>
        <button className="button button--primary" type="button"
          disabled={busy} onClick={() => void start()}>{t("Commencer la finale", "Start final", "Iniciar final")}</button>
      </section>}

      {round && <section className="challenge-board">
        <p className="puzzle-label">{t('TIRAGE','DRAW','SORTEIO')} {Math.min(round.currentIndex + 1, round.totalItems)} / {round.totalItems}</p>
        <p className="challenge-total">{t('Score :','Score:','Pontuação:')} <strong>{round.score} {t('points','points','pontos')}</strong></p>
        {round.current && !round.finished && <>
          <TileRack tiles={round.current.letters} variant="letters" totalSlots={10}/>
          <form className="answer-form" onSubmit={event => void submit(event)}>
            <label htmlFor="final-answer">{t("Votre mot de dix lettres", "Your ten-letter word", "A sua palavra de dez letras")}</label>
            <div className="answer-row">
              <input id="final-answer" value={word} maxLength={30}
                onChange={event => setWord(event.target.value)}
                autoComplete="off" required disabled={busy}/>
              <button className="button button--primary" type="submit" disabled={busy}>{t("Valider", "Submit", "Validar")}</button>
            </div>
          </form>
          <button className="text-button" type="button" disabled={busy}
            onClick={() => void skip()}>{t("Passer ce mot", "Skip word", "Saltar palavra")}</button>
        </>}
        {round.finished && <section className="match-review">
          <h2>{t('Finale terminée :','Final finished:','Final terminada:')} {round.score} {t('points','points','pontos')}</h2>
          {answers && <ol className="challenge-answers">
            {answers.words.map((entry, index) => (
              <li key={index}>
                <strong>{index + 1}. {entry.target}</strong>
                <span>{entry.answer || t("Non résolu", "Unsolved", "Não resolvido")} · {entry.score} {t('points','points','pontos')}</span>
              </li>
            ))}
          </ol>}
          <button className="button button--primary" type="button"
            onClick={() => { setRound(null); setAnswers(null); setFeedback(''); setWord(''); }}>
            {t("Nouvelle finale", "New final", "Nova final")}
          </button>
        </section>}
      </section>}
      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
    </StudioRound>
  );
};
export default FinalWords;
