import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import CountdownClock from '../components/CountdownClock';
import StudioRound from '../components/StudioRound';
import NumberTileBuilder from '../components/NumberTileBuilder';
import TileRack from '../components/TileRack';
import {
  fetchNumbersDraw, fetchNumbersSolutions, NumberOperator,
  NumbersSolution, validateNumbersAnswer
} from '../services/gameService';
import { calculateBuilderStep } from '../utils/numbers';

type Phase = 'select' | 'loading' | 'playing' | 'checking' | 'finished';
interface WorkTerm {
  id: string;
  value: number;
  expression: string;
}

const NumberRound: React.FC = () => {
  const t = useTranslation();
  const [largeCount, setLargeCount] = useState(2);
  const [phase, setPhase] = useState<Phase>('select');
  const [drawId, setDrawId] = useState('');
  const [numbers, setNumbers] = useState<number[]>([]);
  const [target, setTarget] = useState(0);
  const [round, setRound] = useState(0);
  const [expression, setExpression] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [score, setScore] = useState(0);
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [solution, setSolution] = useState<NumbersSolution | null>(null);

  const [available, setAvailable] = useState<WorkTerm[]>([]);
  const [snapshots, setSnapshots] = useState<WorkTerm[][]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [operator, setOperator] = useState<NumberOperator>('+');
  const revisionRef = useRef(0);

  useEffect(() => () => { revisionRef.current += 1; }, []);

  const loadSolution = useCallback(async (id: string, revision: number) => {
    try {
      const result = await fetchNumbersSolutions(id);
      if (revision !== revisionRef.current) return;
      setScore(result.score);
      setSolution(result.solution);
      setResultValue(result.submittedValue);
    } catch {
      if (revision !== revisionRef.current) return;
      setMessage('Partie terminée. Impossible de charger la solution de ce tirage.');
    }
  }, []);

  const startDraw = async () => {
    if (phase !== 'select') return;
    const revision = ++revisionRef.current;
    setPhase('loading');
    setMessage('');
    setScore(0);
    setSuccess(false);
    setSolution(null);
    setResultValue(null);
    try {
      const data = await fetchNumbersDraw(largeCount);
      if (revision !== revisionRef.current) return;
      if (!data.drawId || data.numbers.length !== 6 ||
          data.targetNumber < 101 || data.targetNumber > 999) {
        throw new Error('Tirage incomplet.');
      }
      setNumbers(data.numbers);
      setTarget(data.targetNumber);
      setDrawId(data.drawId);
      setAvailable(data.numbers.map((value, index) => ({
        id: `tile-${index}`, value, expression: String(value)
      })));
      setExpression('');
      setSnapshots([]);
      setSteps([]);
      setLeftId('');
      setRightId('');
      setRound(value => value + 1);
      setPhase('playing');
    } catch {
      if (revision !== revisionRef.current) return;
      setMessage('Impossible de démarrer le tirage. Vérifiez que le serveur est disponible.');
      setPhase('select');
    }
  };

  const addStep = () => {
    if (phase !== 'playing') return;
    const left = available.find(item => item.id === leftId);
    const right = available.find(item => item.id === rightId);
    if (!left || !right || left.id === right.id) {
      setMessage('Choisissez deux plaques ou résultats distincts.');
      return;
    }
    try {
      const value = calculateBuilderStep(left.value, right.value, operator);
      const built = `(${left.expression} ${operator} ${right.expression})`;
      const next = [
        ...available.filter(item => item.id !== leftId && item.id !== rightId),
        { id: `result-${steps.length}`, value, expression: built }
      ];
      setSnapshots(previous => [...previous, available]);
      setAvailable(next);
      setSteps(previous => [
        ...previous, `${left.value} ${operator} ${right.value} = ${value}`
      ]);
      setExpression(built);
      setLeftId('');
      setRightId('');
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Opération invalide.');
    }
  };

  const undoStep = () => {
    if (phase !== 'playing' || snapshots.length === 0) return;
    setAvailable(snapshots[snapshots.length - 1]);
    setSnapshots(previous => previous.slice(0, -1));
    setSteps(previous => previous.slice(0, -1));
    const previous = snapshots[snapshots.length - 2];
    // Keep the expression editable: restoring the previous pool allows
    // choosing another intermediate result without rebuilding the round.
    setExpression('');
    if (previous) setMessage('Étape annulée. Choisissez une nouvelle opération.');
    else setMessage('Dernière étape annulée.');
    setLeftId('');
    setRightId('');
  };

  const finishByTime = useCallback(() => {
    setPhase(current => current === 'playing' ? 'finished' : current);
    setMessage(current => current || 'Temps écoulé. Découvrez la solution ci-dessous.');
    if (drawId) void loadSolution(drawId, revisionRef.current);
  }, [drawId, loadSolution]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== 'playing' || !drawId || !expression.trim()) return;
    const revision = ++revisionRef.current;
    setPhase('checking');
    setMessage('Le serveur vérifie votre calcul…');
    try {
      const response = await validateNumbersAnswer(drawId, expression);
      if (revision !== revisionRef.current) return;
      if (!response.valid) {
        setMessage(response.error || 'Ce calcul n’est pas valable selon les règles.');
        setPhase('playing');
        return;
      }
      setScore(response.score);
      setResultValue(response.value ?? null);
      setSolution(response.solution || null);
      setSuccess(Boolean(response.exact));
      setPhase('finished');
      setMessage(response.exact
        ? 'Le compte est bon ! Le résultat est exact.'
        : `Résultat ${response.value} : écart de ${response.distance} avec la cible.`);
    } catch (error) {
      if (revision !== revisionRef.current) return;
      const status = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 404 || status === 409) {
        setPhase('finished');
        setMessage('Cette ronde est terminée, ou le temps est écoulé.');
        void loadSolution(drawId, revision);
      } else {
        setPhase('playing');
        setMessage('Vérification impossible. Réessayez avant la fin du temps.');
      }
    }
  };

  const reset = () => {
    revisionRef.current += 1;
    setPhase('select');
    setDrawId('');
    setNumbers([]);
    setTarget(0);
    setExpression('');
    setMessage('');
    setSuccess(false);
    setScore(0);
    setResultValue(null);
    setSolution(null);
    setAvailable([]);
    setSnapshots([]);
    setSteps([]);
    setLeftId('');
    setRightId('');
  };

  return (
    <StudioRound number="02" title={t("Le compte est bon","Numbers challenge","Desafio dos números")}
      animationCue={success ? 'success' : 'draw'} animationRevision={round}
      description={t("Six plaques et quatre opérations. Les résultats intermédiaires doivent être positifs, entiers et les divisions exactes.","Six tiles and four operations. Intermediate results must be positive integers and divisions exact.","Seis peças e quatro operações. Os resultados intermédios devem ser inteiros positivos e as divisões exatas.")}
      aside={<>
        <CountdownClock seconds={45} resetKey={round}
          running={phase === 'playing'} onExpire={finishByTime} />
        <p className="aside-note">{t("Le serveur vérifie également le délai de 45 secondes et interdit d’utiliser une plaque deux fois.","The server also enforces the 45-second deadline and prevents reuse of tiles.","O servidor também verifica o limite de 45 segundos e impede a reutilização de peças.")}</p>
      </>}>
      {phase === 'select' && <section className="number-setup">
        <label htmlFor="large-count">{t("Nombre de grandes plaques","Number of large tiles","Número de peças grandes")}</label>
        <select id="large-count" value={largeCount}
          onChange={event => setLargeCount(Number(event.target.value))}>
          {[0, 1, 2, 3, 4].map(count => (
            <option key={count} value={count}>{count} {t(count === 1 ? 'grande' : 'grandes', count === 1 ? 'large tile' : 'large tiles', count === 1 ? 'peça grande' : 'peças grandes')}</option>
          ))}
        </select>
        <button className="button button--primary" type="button"
          onClick={() => void startDraw()}>{t("Lancer le tirage","Start draw","Iniciar sorteio")}</button>
      </section>}

      {phase !== 'select' && <>
        <div className="puzzle-label">{t("LE NOMBRE À ATTEINDRE","TARGET NUMBER","NÚMERO ALVO")}</div>
        <div className="target-display">{phase === 'loading' ? '···' : target}</div>
        <div className="puzzle-label">{t("LES SIX PLAQUES","THE SIX TILES","AS SEIS PEÇAS")}</div>
        <TileRack tiles={numbers} variant="numbers" totalSlots={6} />
      </>}

      {(phase === 'playing' || phase === 'checking' || phase === 'finished') && <>
        <NumberTileBuilder key={drawId} numbers={numbers} disabled={phase !== 'playing'} onCompose={setExpression} />
        <section className="number-builder" aria-label={t("Calcul par étapes","Step-by-step calculation","Cálculo por etapas")}>
          <h2>{t("Construire le calcul","Build the calculation","Construir o cálculo")}</h2>
          <p>{t("Choisissez deux termes et une opération. Le résultat devient une nouvelle plaque utilisable.","Choose two terms and an operation. The result becomes a reusable tile.","Escolha dois termos e uma operação. O resultado torna-se uma nova peça utilizável.")}</p>
          <div className="number-available">
            {available.map(item =>
              <span key={item.id} className="number-available-tile">{item.value}</span>
            )}
          </div>
          <div className="number-step-controls">
            <label>{t("Premier terme","First term","Primeiro termo")}
              <select aria-label={t("Premier terme","First term","Primeiro termo")} value={leftId} disabled={phase !== 'playing'}
                onChange={event => setLeftId(event.target.value)}>
                <option value="">{t("Choisir…","Choose…","Escolher…")}</option>
                {available.map(item => <option key={item.id} value={item.id}>{item.value}</option>)}
              </select>
            </label>
            <label>{t("Opération","Operation","Operação")}
              <select aria-label={t("Opération","Operation","Operação")} value={operator} disabled={phase !== 'playing'}
                onChange={event => setOperator(event.target.value as NumberOperator)}>
                <option value="+">+</option><option value="-">−</option>
                <option value="*">×</option><option value="/">÷</option>
              </select>
            </label>
            <label>{t("Second terme","Second term","Segundo termo")}
              <select aria-label={t("Second terme","Second term","Segundo termo")} value={rightId} disabled={phase !== 'playing'}
                onChange={event => setRightId(event.target.value)}>
                <option value="">{t("Choisir…","Choose…","Escolher…")}</option>
                {available.map(item => <option key={item.id} value={item.id}>{item.value}</option>)}
              </select>
            </label>
          </div>
          <div className="number-builder-actions">
            <button type="button" className="button button--outline"
              onClick={addStep} disabled={phase !== 'playing' || available.length < 2}>
              {t("Ajouter une étape","Add step","Adicionar etapa")}
            </button>
            <button type="button" className="text-button"
              onClick={undoStep} disabled={phase !== 'playing' || snapshots.length === 0}>
              {t("Annuler l’étape","Undo step","Desfazer etapa")}
            </button>
          </div>
          {steps.length > 0 && <ol className="number-steps">
            {steps.map((text, index) => <li key={index}>{text}</li>)}
          </ol>}
        </section>

        <form className="answer-form" onSubmit={event => void submit(event)}>
          <label htmlFor="number-answer">{t("Votre expression (ou saisie libre)","Your expression (or free input)","A sua expressão (ou introdução livre)")}</label>
          <div className="answer-row">
            <input id="number-answer" value={expression}
              onChange={event => setExpression(event.target.value)}
              placeholder="(10 + 5) × 8 - 3" autoComplete="off"
              maxLength={180} disabled={phase !== 'playing'} required />
            <button className="button button--primary" type="submit"
              disabled={phase !== 'playing'}>{t("Valider","Submit","Validar")}</button>
          </div>
        </form>
      </>}

      {message && <p className={`answer-feedback ${success ? 'answer-feedback--success' : ''}`}
        role="status">{message}</p>}

      {phase === 'finished' && <section className="letter-results" aria-label={t("Résultat du compte","Calculation result","Resultado do cálculo")}>
        <h2>{t("Résultat du compte","Calculation result","Resultado do cálculo")}</h2>
        <p className="letter-score">{t("Votre score :","Your score:","A sua pontuação:")} <strong>{score} {t('points','points','pontos')}</strong></p>
        {resultValue !== null && <p>{t("Votre résultat :","Your result:","O seu resultado:")} <strong>{resultValue}</strong> ({t('cible','target','alvo')} {target})</p>}
        {solution ? <>
          <p>{t("Meilleur résultat trouvé :","Best result found:","Melhor resultado encontrado:")} <strong>{solution.value}</strong>
            {' '}— {t('écart de','difference of','diferença de')} <strong>{solution.distance}</strong>
          </p>
          <p className="number-solution-expression">{solution.expression}</p>
          <ol className="number-solution-steps">
            {solution.steps.map((step, index) => (
              <li key={index}>{step.left} {step.operator} {step.right} = {step.result}</li>
            ))}
          </ol>
          <p className="letter-data-note">{t("Barème provisoire : 10 points exact, 7 points pour un écart de 1 à 5, 5 points pour 6 à 10, sinon 0.","Provisional scoring: 10 points for exact, 7 for a difference of 1–5, 5 for 6–10, otherwise 0.","Pontuação provisória: 10 pontos para resultado exato, 7 para diferença de 1 a 5, 5 para 6 a 10, caso contrário 0.")}</p>
        </> : <p className="letter-data-note">{t("Chargement de la meilleure solution…","Loading best solution…","A carregar a melhor solução…")}</p>}
      </section>}

      <button type="button" className="text-button" onClick={reset}
        disabled={phase === 'loading'}>{t("↻ Nouveau tirage","↻ New draw","↻ Novo sorteio")}</button>
    </StudioRound>
  );
};

export default NumberRound;
