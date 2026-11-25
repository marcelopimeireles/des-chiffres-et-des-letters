import { useEffect, useState } from 'react';

const secondsUntil = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

export function useRiveClock(deadline?: number) {
  const [clock, setClock] = useState({ deadline: 0, seconds: 0 });

  useEffect(() => {
    if (!deadline) return;
    let timer: number | undefined;
    const update = () => {
      const seconds = secondsUntil(deadline);
      setClock(previous => previous.deadline === deadline && previous.seconds === seconds
        ? previous : { deadline, seconds });
      if (seconds > 0) timer = window.setTimeout(update, 200);
    };
    update();
    return () => window.clearTimeout(timer);
  }, [deadline]);

  if (!deadline) return 0;
  return clock.deadline === deadline ? clock.seconds : secondsUntil(deadline);
}
