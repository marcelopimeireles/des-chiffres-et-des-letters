import React, { useEffect, useState } from 'react';

interface CountdownClockProps {
  seconds: number;
  resetKey: number;
  running?: boolean;
}

const CountdownClock: React.FC<CountdownClockProps> = ({
  seconds, resetKey, running = true
}) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => setRemaining(seconds), [seconds, resetKey]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = window.setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [running, remaining]);

  const angle = Math.round((remaining / seconds) * 360);
  return (
    <div className={`countdown ${remaining <= 10 ? 'countdown--urgent' : ''}`}
      role="timer" aria-label={`Temps restant: ${remaining} secondes`}>
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
