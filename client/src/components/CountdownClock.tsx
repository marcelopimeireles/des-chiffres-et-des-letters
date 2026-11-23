import React, { useEffect, useRef, useState } from 'react';

interface CountdownClockProps {
  seconds: number;
  resetKey: number;
  running?: boolean;
  onExpire?: () => void;
}

/** Wall-clock based visual timer; the owning game controls the round phase. */
const CountdownClock: React.FC<CountdownClockProps> = ({
  seconds, resetKey, running = true, onExpire
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const expirationCallback = useRef(onExpire);
  const expired = useRef(false);
  expirationCallback.current = onExpire;

  useEffect(() => {
    setRemaining(seconds);
    expired.current = false;
  }, [seconds, resetKey]);

  useEffect(() => {
    if (!running || remaining <= 0 || expired.current) return;
    const deadline = Date.now() + remaining * 1000;
    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !expired.current) {
        expired.current = true;
        window.clearInterval(interval);
        expirationCallback.current?.();
      }
    }, 100);
    return () => window.clearInterval(interval);
    // Only restart the interval on explicit pause, resume or new round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, seconds, resetKey]);

  const angle = Math.round((remaining / seconds) * 360);
  return (
    <div className={`countdown ${remaining <= 10 ? 'countdown--urgent' : ''}`}
      role="timer" aria-label={`Temps restant : ${remaining} secondes`}>
      <div className="countdown-dial"
        style={{ background: `conic-gradient(var(--accent) ${angle}deg, rgba(255,255,255,.12) ${angle}deg)` }}>
        <div className="countdown-center">
          <strong>{remaining}</strong><span>SEC</span>
        </div>
      </div>
      <span className="countdown-caption">{remaining === 0 ? 'TEMPS ÉCOULÉ' : 'TEMPS RESTANT'}</span>
    </div>
  );
};

export default CountdownClock;
