import React, { useEffect, useRef, useState } from 'react';

/**
 * Rive is optional: without VITE_RIVE_STUDIO_SRC we display a CSS
 * studio illustration. A supplied .riv file should expose a state machine
 * named "Studio" with triggers "intro", "draw", and "success".
 * Runtime is loaded on demand to keep the existing dependency lockfile intact.
 */
type Input = { name: string; fire?: () => void };
type RiveInstance = {
  stateMachineInputs: (name: string) => Input[];
  resizeDrawingSurfaceToCanvas: () => void;
  cleanup: () => void;
};
type RiveConstructor = new (options: {
  src: string;
  canvas: HTMLCanvasElement;
  autoplay: boolean;
  stateMachines: string;
  onLoad?: () => void;
  onLoadError?: () => void;
}) => RiveInstance;
declare global {
  interface Window { rive?: { Rive: RiveConstructor } }
}

const RIVE_RUNTIME = 'https://unpkg.com/@rive-app/canvas@2.45.0';
let runtimePromise: Promise<void> | undefined;

function loadRuntime(): Promise<void> {
  if (window.rive) return Promise.resolve();
  if (!runtimePromise) {
    runtimePromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RIVE_RUNTIME;
      script.async = true;
      script.onload = () => window.rive ? resolve() : reject(new Error('Rive runtime unavailable'));
      script.onerror = () => reject(new Error('Failed to load Rive runtime'));
      document.head.appendChild(script);
    }).catch(error => {
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}

const assetUrl = process.env.VITE_RIVE_STUDIO_SRC || '';

interface RiveSceneProps {
  cue?: 'intro' | 'draw' | 'success';
  revision?: number;
  compact?: boolean;
}

const RiveScene: React.FC<RiveSceneProps> = ({ cue = 'intro', revision = 0, compact = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<RiveInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!assetUrl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    loadRuntime().then(() => {
      if (disposed || !canvasRef.current || !window.rive) return;
      const instance = new window.rive.Rive({
        src: assetUrl,
        canvas: canvasRef.current,
        autoplay: true,
        stateMachines: 'Studio',
        onLoad: () => {
          if (disposed) return;
          setReady(true);
          instanceRef.current?.resizeDrawingSurfaceToCanvas();
        },
        onLoadError: () => { if (!disposed) setFailed(true); }
      });
      instanceRef.current = instance;
      if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => instance.resizeDrawingSurfaceToCanvas());
        resizeObserver.observe(canvasRef.current);
      }
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      instanceRef.current?.cleanup();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      instanceRef.current?.stateMachineInputs('Studio')
        .find(input => input.name === cue)?.fire?.();
    }
  }, [cue, revision, ready]);

  return (
    <div className={`studio-visual ${compact ? "studio-visual--compact" : ""}`} aria-hidden="true">
      {!compact && <div className={`studio-fallback ${ready ? 'studio-fallback--hidden' : ''}`}>
        <div className="studio-orbit studio-orbit--outer" />
        <div className="studio-orbit studio-orbit--inner" />
        <div className="studio-light studio-light--left" />
        <div className="studio-light studio-light--right" />
        <div className="studio-stage">
          <div className="studio-display">
            <span>DES CHIFFRES</span>
            <span className="display-amp">&</span>
            <span>DES LETTRES</span>
          </div>
          <div className="studio-mini-tiles">
            {['7', 'A', '3', 'R', '8', 'E'].map((item, index) => (
              <span key={index} style={{ animationDelay: `${index * 110}ms` }}>{item}</span>
            ))}
          </div>
        </div>
        <div className="studio-floor" />
      </div>}
      {assetUrl && !failed && (
        <canvas ref={canvasRef} className="rive-canvas"
          style={{ opacity: ready ? 1 : 0 }} />
      )}
    </div>
  );
};

export default RiveScene;
