import React, { useEffect, useRef, useState } from 'react';
import { Alignment, Fit, Layout, Rive, ViewModelInstance } from '@rive-app/canvas';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBNÉÈÇÀ', '1234567890', '+-*/()ÊÙÔÎ'];
export const GAME_KEYS = KEY_ROWS.join('').split('');
const TEXT_FIELDS = [
  'progress', 'heading', 'caption', 'clock', 'score', 'answer', 'feedback',
  'primaryLabel', 'secondaryLabel', 'auxiliaryLabel', 'backspaceLabel', 'refreshLabel', 'resetLabel'
] as const;

type TextField = typeof TEXT_FIELDS[number];
export type BoardAction = 'primary' | 'secondary' | 'auxiliary' | 'backspace' | 'refresh' | 'reset';
const ACTIONS: BoardAction[] = ['primary', 'secondary', 'auxiliary', 'backspace', 'refresh', 'reset'];

interface BoardProps {
  text: Record<TextField, string>;
  tiles: (number | string)[];
  keyboardVisible: boolean;
  revealKey?: string;
  onAction: (action: BoardAction) => void;
  onKey: (key: string) => void;
}

const ASSET_URL = process.env.VITE_RIVE_GAME_SRC || '/animations/game-board.riv';

const RiveGameBoard: React.FC<BoardProps> = ({ text, tiles, keyboardVisible, revealKey, onAction, onKey }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const handlers = useRef({ onAction, onKey });
  const [model, setModel] = useState<ViewModelInstance | null>(null);
  const [failed, setFailed] = useState(false);
  handlers.current = { onAction, onKey };

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;

    let disposed = false;
    const unsubscribers: Array<() => void> = [];
    const rive = new Rive({
      src: ASSET_URL,
      canvas: element,
      artboard: 'Game Board',
      stateMachines: 'Game',
      autoplay: true,
      autoBind: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        if (disposed) return;
        const instance = rive.viewModelInstance;
        const triggers = [
          ...ACTIONS.map(action => ({ name: action, run: () => handlers.current.onAction(action) })),
          ...GAME_KEYS.map((key, index) => ({ name: `key${index}`, run: () => handlers.current.onKey(key) }))
        ];
        if (!instance || triggers.some(({ name }) => !instance.trigger(name))) {
          setFailed(true);
          return;
        }
        triggers.forEach(({ name, run }) => {
          const trigger = instance.trigger(name);
          if (trigger) {
            trigger.on(run);
            unsubscribers.push(() => trigger.off(run));
          }
        });
        rive.resizeDrawingSurfaceToCanvas();
        setModel(instance);
      },
      onLoadError: () => { if (!disposed) setFailed(true); }
    });

    const resize = () => rive.resizeDrawingSurfaceToCanvas();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(element);
    window.addEventListener('resize', resize);
    return () => {
      disposed = true;
      unsubscribers.forEach(unsubscribe => unsubscribe());
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      rive.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!model) return;
    const write = (name: string, value: string) => {
      const field = model.string(name);
      if (field && field.value !== value) field.value = value;
    };
    TEXT_FIELDS.forEach(field => write(field, text[field]));
    Array.from({ length: 10 }, (_, index) => write(`tile${index}`, String(tiles[index] ?? '·')));
    const opacity = model.number('keyboardOpacity');
    if (opacity) opacity.value = keyboardVisible ? 1 : 0;
  }, [model, text, tiles, keyboardVisible]);

  useEffect(() => {
    if (revealKey && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      model?.trigger('reveal')?.trigger();
    }
  }, [model, revealKey]);

  return (
    <div className="rive-game">
      {failed ? <p role="alert">Le tableau Rive n’a pas pu être chargé. <a href="/match">Ouvrir la partie classique</a></p> : (
        <canvas ref={canvas} width={600} height={774} tabIndex={0}
          aria-label={`${text.heading}. ${text.caption}. ${text.score}. ${text.clock}.`}
          onKeyDown={event => {
            if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
            if (event.key === 'Enter' || event.key === 'Backspace' || event.key.length === 1) {
              event.preventDefault();
              if (event.key === 'Enter') onAction('primary');
              else if (event.key === 'Backspace') onAction('backspace');
              else onKey(event.key);
            }
          }}
          onPointerDown={event => event.currentTarget.focus()}
        />
      )}
      {!model && !failed && <p role="status">Chargement du tableau Rive…</p>}
    </div>
  );
};

export default RiveGameBoard;
