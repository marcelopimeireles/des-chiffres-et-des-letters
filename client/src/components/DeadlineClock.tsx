import React, { useEffect, useRef, useState } from 'react';

interface DeadlineClockProps {
  deadlineAt: number;
  totalSeconds?: number;
  running: boolean;
  onExpire: () => void;
}

/** Absolute server deadline: a browser refresh cannot restart the countdown. */
const DeadlineClock: React.FC<DeadlineClockProps> = ({ deadlineAt, running, onExpire, totalSeconds = 45 }) => {
  const remainingAt = () => Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(remainingAt);
  const called = useRef(false);
  const callback = useRef(onExpire);
  callback.current = onExpire;

  useEffect(() => {
    called.current = false;
    setRemaining(remainingAt());
    if (!running) return;
    const tick = () => {
      const seconds = remainingAt();
      setRemaining(seconds);
      if (seconds === 0 && !called.current) {
        called.current = true;
        callback.current();
      }
    };
    const interval = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(interval);
    // deadlineAt is the identity of an active round and should not be rearmed on callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineAt, running]);

  const angle = Math.min(360, Math.round((remaining / totalSeconds) * 360));
  return (
    <div className={`countdown ${remaining <= 10 ? 'countdown--urgent' : ''}`}
      role="timer" aria-label={`Temps restant : ${remaining} secondes`}>
      <div className="countdown-dial" style={{
        background: `conic-gradient(var(--accent) ${angle}deg, rgba(255,255,255,.12) ${angle}deg)`
      }}>
        <div className="countdown-center">
          <strong>{remaining}</strong><span>SEC</span>
        </div>
      </div>
      <span className="countdown-caption">
        {remaining === 0 ? 'TEMPS ÉCOULÉ' : 'TEMPS RESTANT'}
      </span>
    </div>
  );
};

export default DeadlineClock;
