import React, { useEffect, useState } from 'react';
import { useTranslation, useGameLanguage } from '../i18n';
import DeadlineClock from '../components/DeadlineClock';
import StudioRound from '../components/StudioRound';
import TileRack from '../components/TileRack';
import {
  createDuelDraw, fetchDuelDraw, fetchDuelSolution,
  validateDuelAnswer, DuelKind, DuelRound
} from '../services/gameService';

const Duel: React.FC = () => {
  const t = useTranslation();
  const [kind, setKind] = useState<DuelKind>('anagram');
  const language = useGameLanguage();
  const [round, setRound] = useState<DuelRound | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [solution, setSolution] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async (id: string) => {
    try { setRound(await fetchDuelDraw(id)); }
    catch { setFeedback(t("Impossible de récupérer le duel.", "Unable to retrieve the duel.", "Não foi possível recuperar o duelo.")); }
  };

  useEffect(() => {
    if (!round?.finished || solution) return;
    let alive = true;
    fetchDuelSolution(round.drawId).then(data => {
      if (alive) setSolution(data.answer);
    }).catch(() => {});
    return () => { alive = false; };
  }, [round?.drawId, round?.finished, solution]);

  const start = async () => {
    if (busy) return;
    setBusy(true); setFeedback(''); setSolution(''); setInput('');
    try { setRound(await createDuelDraw(kind, language)); }
    catch { setFeedback(t("Impossible de créer le duel.", "Unable to create the duel.", "Não foi possível criar o duelo.")); }
    finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!round || round.finished || busy) return;
    setBusy(true);
    try {
      const attempt = await validateDuelAnswer(round.drawId, input);
      setFeedback(attempt.valid
        ? t(`Bonne réponse ! ${attempt.score} points.`, `Correct answer! ${attempt.score} points.`, `Resposta correta! ${attempt.score} pontos.`)
        : attempt.reason === 'invalid_format'
          ? t("Format incorrect pour ce duel.", "Invalid format for this duel.", "Formato inválido para este duelo.") : t("Réponse incorrecte, réessayez.", "Incorrect answer, try again.", "Resposta incorreta, tente novamente."));
      if (attempt.valid) await refresh(round.drawId);
    } catch {
      await refresh(round.drawId);
      setFeedback(t("Le duel est terminé ou la réponse ne peut être vérifiée.", "The duel has ended or the answer cannot be checked.", "O duelo terminou ou a resposta não pode ser verificada."));
    } finally { setBusy(false); }
  };

  return (
    <StudioRound number="03" title={t("Les duels", "Duels", "Duelos")}
      animationCue={round?.finished && round.score > 0 ? 'success' : 'draw'}
      description={t("Deux types de duel : trouver un anagramme ou résoudre un calcul mental. Validation côté serveur.", "Two duel types: solve an anagram or a mental calculation. Server-side validation.", "Dois tipos de duelo: resolver um anagrama ou um cálculo mental. Validação no servidor.")}
      aside={round && <><DeadlineClock deadlineAt={round.deadlineAt}
        running={!round.finished} onExpire={() => void refresh(round.drawId)} />
        <p className="aside-note">{t("30 secondes par duel. 8 points pour une bonne réponse.", "30 seconds per duel. 8 points for a correct answer.", "30 segundos por duelo. 8 pontos por resposta correta.")}</p></>}>
      {!round && <section className="challenge-setup">
        <label htmlFor="duel-kind">{t("Type de duel", "Duel type", "Tipo de duelo")}
          <select id="duel-kind" value={kind} onChange={event => setKind(event.target.value as DuelKind)}>
            <option value="anagram">{t("Anagramme", "Anagram", "Anagrama")}</option><option value="mental">{t("Calcul mental", "Mental arithmetic", "Cálculo mental")}</option>
          </select>
        </label>
        <button className="button button--primary" type="button" disabled={busy}
          onClick={() => void start()}>{t("Commencer le duel", "Start duel", "Iniciar duelo")}</button>
      </section>}

      {round && <section className="challenge-board">
        <p className="puzzle-label">{round.kind === 'anagram' ? t("ANAGRAMME", "ANAGRAM", "ANAGRAMA") : t("CALCUL MENTAL", "MENTAL ARITHMETIC", "CÁLCULO MENTAL")}</p>
        {round.kind === 'anagram'
          ? <TileRack tiles={round.letters || []} variant="letters" />
          : <div className="challenge-calculation">{round.challenge}</div>}
        {!round.finished && <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="duel-answer">{round.kind === 'anagram' ? t("Votre mot", "Your word", "A sua palavra") : t("Votre résultat", "Your result", "O seu resultado")}</label>
          <div className="answer-row">
            <input id="duel-answer" value={input} autoComplete="off" required
              onChange={event => setInput(event.target.value)} disabled={busy} maxLength={40} />
            <button className="button button--primary" type="submit" disabled={busy}>{t("Valider", "Submit", "Validar")}</button>
          </div>
        </form>}
        {round.finished && <section className="match-review">
          <h3>{t("Duel terminé", "Duel finished", "Duelo terminado")}</h3>
          <p className="match-score-highlight">{round.score} {t('points','points','pontos')}</p>
          {solution && <p>{t("Réponse attendue :", "Expected answer:", "Resposta esperada:")} <strong>{solution}</strong></p>}
          <button className="button button--primary" type="button"
            onClick={() => { setRound(null); setInput(''); setFeedback(''); setSolution(''); }}>
            {t("Nouveau duel", "New duel", "Novo duelo")}
          </button>
        </section>}
      </section>}
      {feedback && <p className="answer-feedback" role="status">{feedback}</p>}
    </StudioRound>
  );
};
export default Duel;
