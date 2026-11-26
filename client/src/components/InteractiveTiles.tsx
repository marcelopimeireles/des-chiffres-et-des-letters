import React, { useState } from 'react';

interface Props {
  tiles: readonly (string | number)[];
  disabled?: boolean;
  onCompose: (values: (string | number)[]) => void;
}

// Physical tile IDs are indices in the immutable server draw.
export default function InteractiveTiles({ tiles, disabled = false, onCompose }: Props) {
  const [rack, setRack] = useState(() => tiles.map((_, i) => i));
  const [word, setWord] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<{ rack: number[]; word: number[] }[]>([]);
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
    <div role="group" aria-label={label} onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const raw = e.dataTransfer.getData('text/plain'); if (/^\\d+$/.test(raw)) move(Number(raw), target); }}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 54, padding: 8, border: '1px dashed currentColor', borderRadius: 8 }}>
      {ids.map(id => <button key={id} type="button" disabled={disabled} draggable={!disabled}
        aria-label={label + ' ' + tiles[id] + ' ' + (id + 1)} aria-pressed={selected === id}
        onDragStart={e => e.dataTransfer.setData('text/plain', String(id))}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); const raw = e.dataTransfer.getData('text/plain'); if (/^\\d+$/.test(raw)) move(Number(raw), target, id); }}
        onClick={() => { if (selected === null) setSelected(id); else if (selected === id) setSelected(null); else move(selected, target, id); }}
        style={{ minWidth: 44, minHeight: 44, fontSize: 22, fontWeight: 700, borderRadius: 5, border: selected === id ? '3px solid #e5b64a' : '1px solid #8294aa', background: '#edf3fa', color: '#152c49' }}>{tiles[id]}</button>)}
      <button type="button" aria-label={target === 'word' ? 'Ajouter au mot' : 'Rendre au tirage'} disabled={disabled || selected === null} onClick={() => { if (selected !== null) move(selected, target); }}>+</button>
    </div>
  );
  return <section aria-label="Composition visuelle">
    <p>Sélectionnez une pièce puis sa destination, ou faites-la glisser.</p>
    {zone(rack, 'rack', 'Lettres disponibles')}
    <p>Votre composition</p>
    {zone(word, 'word', 'Mot composé')}
    <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
      <button type="button" disabled={disabled || !history.length} onClick={() => {
        const previous = history[history.length - 1]; if (!previous) return;
        setHistory(h => h.slice(0,-1)); setRack(previous.rack); setWord(previous.word); setSelected(null); onCompose(previous.word.map(i => tiles[i]));
      }}>Annuler</button>
      <button type="button" disabled={disabled} onClick={() => apply(tiles.map((_,i)=>i), [])}>Restaurer</button>
      <button type="button" disabled={disabled} onClick={() => {
        const next = [...rack]; for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [next[i],next[j]]=[next[j],next[i]];} apply(next,word);
      }}>Mélanger</button>
    </div>
  </section>;
}
