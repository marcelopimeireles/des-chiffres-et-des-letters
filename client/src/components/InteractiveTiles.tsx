import React, { useState, useRef } from 'react';

import { useTranslation } from '../i18n';

interface Props {
  tiles: readonly (string | number)[];
  disabled?: boolean;
  onCompose: (values: (string | number)[]) => void;
}

// Physical tile IDs are indices in the immutable server draw.
export default function InteractiveTiles({ tiles, disabled = false, onCompose }: Props) {
  const t = useTranslation();
  const [rack, setRack] = useState(() => tiles.map((_, i) => i));
  const [word, setWord] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<{ rack: number[]; word: number[] }[]>([]);
  const gesture = useRef<{id:number; pointer:number; x:number; y:number; moved:boolean} | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{id:number; x:number; y:number} | null>(null);
  const apply = (nextRack: number[], nextWord: number[]) => {
    if (disabled) return;
    setHistory(h => [...h, { rack, word }]);
    setRack(nextRack); setWord(nextWord); setSelected(null);
    onCompose(nextWord.map(i => tiles[i]));
  };
  const move = (id: number, target: 'rack' | 'word', before?: number) => {
    if (disabled || (!rack.includes(id) && !word.includes(id)) || id === before) return;
    const r = rack.filter(i => i !== id), w = word.filter(i => i !== id);
    const list = target === 'rack' ? r : w;
    const pos = before === undefined ? -1 : list.indexOf(before);
    list.splice(pos < 0 ? list.length : pos, 0, id);
    apply(r, w);
  };
  const zone = (ids: number[], target: 'rack' | 'word', label: string) => (
    <div role="group" aria-label={label} data-zone={target}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 54, padding: 8, border: '1px dashed currentColor', borderRadius: 8 }}>
      {ids.map(id => <button key={id} type="button" disabled={disabled} data-tile={id}
        aria-label={label + ' ' + tiles[id] + ' ' + (id + 1)} aria-pressed={selected === id}
        onPointerDown={e => {
          if (disabled || !e.isPrimary || e.button !== 0) return;
          suppressClick.current = false;
          gesture.current = {id, pointer:e.pointerId, x:e.clientX, y:e.clientY, moved:false};
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const g = gesture.current;
          if (!g || g.pointer !== e.pointerId) return;
          if (Math.hypot(e.clientX-g.x,e.clientY-g.y)>6) g.moved=true;
          if (g.moved) setGhost({id:g.id,x:e.clientX,y:e.clientY});
        }}
        onPointerUp={e => {
          const g = gesture.current;
          if (!g || g.pointer !== e.pointerId) return;
          gesture.current=null; setGhost(null);
          if (!g.moved) return;
          suppressClick.current=true;
          const hit=document.elementFromPoint(e.clientX,e.clientY);
          const dest=hit?.closest('[data-zone]');
          const targetZone=dest?.getAttribute('data-zone');
          const raw=hit?.closest('[data-tile]')?.getAttribute('data-tile');
          if (targetZone==='rack' || targetZone==='word') move(g.id,targetZone,raw == null ? undefined : Number(raw));
        }}
        onPointerCancel={() => { gesture.current=null; setGhost(null); suppressClick.current=true; }}
        onLostPointerCapture={() => { gesture.current=null; setGhost(null); }}
        onClick={() => { if (suppressClick.current) { suppressClick.current=false; return; } if (selected === null) setSelected(id); else if (selected === id) setSelected(null); else move(selected, target, id); }}
        style={{ touchAction:'none', userSelect:'none', opacity:ghost?.id===id?0.45:1, minWidth: 44, minHeight: 44, fontSize: 22, fontWeight: 700, borderRadius: 5, border: selected === id ? '3px solid #e5b64a' : '1px solid #8294aa', background: '#edf3fa', color: '#152c49' }}>{tiles[id]}</button>)}
      <button type="button" aria-label={target === 'word' ? t("Ajouter au mot", "Add to word", "Adicionar à palavra") : t("Rendre au tirage", "Return to rack", "Devolver ao tabuleiro")} disabled={disabled || selected === null} onClick={() => { if (selected !== null) move(selected, target); }}>+</button>
    </div>
  );
  return <section aria-label={t("Composition visuelle", "Visual composition", "Composição visual")}>
    {ghost && !disabled && <div aria-hidden="true" style={{position:"fixed",left:ghost.x,top:ghost.y,transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:9999,background:"#edf3fa",color:"#152c49",padding:12,borderRadius:5,fontSize:22,fontWeight:700}}>{tiles[ghost.id]}</div>}
    <p>{t("Sélectionnez une pièce puis sa destination, ou faites-la glisser.", "Select a tile and its destination, or drag it.", "Selecione uma peça e o seu destino, ou arraste-a.")}</p>
    {zone(rack, 'rack', t("Lettres disponibles", "Available letters", "Letras disponíveis"))}
    <p>{t("Votre composition", "Your composition", "A sua composição")}</p>
    {zone(word, 'word', t("Mot composé", "Composed word", "Palavra composta"))}
    <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
      <button type="button" disabled={disabled || !history.length} onClick={() => {
        const previous = history[history.length - 1]; if (!previous) return;
        setHistory(h => h.slice(0,-1)); setRack(previous.rack); setWord(previous.word); setSelected(null); onCompose(previous.word.map(i => tiles[i]));
      }}>{t("Annuler", "Undo", "Desfazer")}</button>
      <button type="button" disabled={disabled} onClick={() => apply(tiles.map((_,i)=>i), [])}>{t("Restaurer", "Reset", "Restaurar")}</button>
      <button type="button" disabled={disabled} onClick={() => {
        const next = [...rack]; for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [next[i],next[j]]=[next[j],next[i]];} apply(next,word);
      }}>{t("Mélanger", "Shuffle", "Embaralhar")}</button>
    </div>
  </section>;
}
