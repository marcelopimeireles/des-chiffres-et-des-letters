import React, { useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import { NumberOperator } from '../services/gameService';
import { calculateBuilderStep } from '../utils/numbers';

type Term = { id: string; value: number; expression: string };
type Props = { numbers: number[]; disabled?: boolean; onCompose: (expression: string) => void };
const initial = (numbers: number[]): Term[] => numbers.map((value, i) => ({ id: 'tile-' + i, value, expression: String(value) }));

export default function NumberTileBuilder({ numbers, disabled, onCompose }: Props) {
  const t = useTranslation();
  const [pool, setPool] = useState(() => initial(numbers));
  const [history, setHistory] = useState<{ pool: Term[]; steps: string[]; expression: string }[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [expression, setExpression] = useState('');
  const [slots, setSlots] = useState<[string, string]>(['', '']);
  const [op, setOp] = useState<NumberOperator>('+');
  const [error, setError] = useState('');
  const drag = useRef<{ id: string; x: number; y: number } | null>(null);
  const suppress = useRef(false);
  const assign = (id: string, index?: number) => {
    if (disabled) return;
    setSlots(old => {
      const next: [string, string] = [old[0], old[1]];
      if (next.includes(id)) next[next.indexOf(id)] = '';
      next[index ?? (next[0] ? 1 : 0)] = id;
      return next;
    });
  };
  const apply = () => {
    if (disabled) return;
    const a = pool.find(x => x.id === slots[0]), b = pool.find(x => x.id === slots[1]);
    if (!a || !b || a.id === b.id) return;
    try {
      const value = calculateBuilderStep(a.value, b.value, op);
      const built = '(' + a.expression + ' ' + op + ' ' + b.expression + ')';
      setHistory(old => [...old, { pool, steps, expression }]);
      setPool(old => [...old.filter(x => x.id !== a.id && x.id !== b.id), { id: 'result-' + steps.length, value, expression: built }]);
      setSteps(old => [...old, a.value + ' ' + op + ' ' + b.value + ' = ' + value]);
      setSlots(['', '']); setError(''); setExpression(built); onCompose(built);
    } catch { setError(t('Opération invalide.', 'Invalid operation.', 'Operação inválida.')); }
  };
  const undo = () => {
    const previous = history[history.length - 1];
    if (disabled || !previous) return;
    setPool(previous.pool); setSteps(previous.steps); setExpression(previous.expression);
    setHistory(old => old.slice(0, -1)); setSlots(['', '']); setError(''); onCompose(previous.expression);
  };
  return <section className="number-builder">
    <h3>{t('Calcul visuel','Visual calculation','Cálculo visual')}</h3>
    <p>{t('Touchez ou glissez deux plaques vers les cases.','Tap or drag two tiles into the slots.','Toque ou arraste duas peças para as caixas.')}</p>
    <div className="number-available">
      {pool.map(item => <button key={item.id} type="button" className="number-available-tile" disabled={disabled}
        aria-pressed={slots.includes(item.id)} style={{touchAction:'none', opacity: slots.includes(item.id) ? 0.55 : 1}}
        onPointerDown={e => { suppress.current = false; drag.current = {id:item.id,x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerCancel={() => { drag.current = null; }}
        onPointerUp={e => { const d = drag.current; drag.current = null; if (!d || Math.hypot(e.clientX-d.x,e.clientY-d.y)<6) return;
          suppress.current = true; const slot = document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-number-slot]')?.getAttribute('data-number-slot');
          if (slot === '0' || slot === '1') assign(d.id, Number(slot)); }}
        onClick={() => { if (!suppress.current) assign(item.id); suppress.current = false; }}>{item.value}</button>)}
    </div>
    <div className="number-step-controls">
      {[0,1].map(i => <React.Fragment key={i}>{i === 1 && <select aria-label={t('Opération','Operation','Operação')} value={op} disabled={disabled} onChange={e => setOp(e.target.value as NumberOperator)}>
        <option value="+">+</option><option value="-">−</option><option value="*">×</option><option value="/">÷</option></select>}
        <button type="button" data-number-slot={i} disabled={disabled} style={{minWidth:72,minHeight:52,border:'2px dashed currentColor'}}
          aria-label={i === 0 ? t('Premier terme','First term','Primeiro termo') : t('Second terme','Second term','Segundo termo')}
          onClick={() => setSlots(old => i === 0 ? ['',old[1]] : [old[0],''])}>{pool.find(x => x.id === slots[i])?.value ?? '—'}</button>
      </React.Fragment>)}
    </div>
    <div className="number-builder-actions">
      <button type="button" disabled={disabled || !slots[0] || !slots[1]} onClick={apply}>{t('Calculer','Calculate','Calcular')}</button>
      <button type="button" disabled={disabled || !history.length} onClick={undo}>{t('Annuler','Undo','Desfazer')}</button>
      <button type="button" disabled={disabled} onClick={() => {setPool(initial(numbers));setHistory([]);setSteps([]);setSlots(['','']);setError('');setExpression('');onCompose('');}}>{t('Réinitialiser','Reset','Reiniciar')}</button>
    </div>
    {error && <p role="status">{error}</p>}
    <ol>{steps.map((step,i) => <li key={i}>{step}</li>)}</ol>
  </section>;
}
