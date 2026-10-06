import { useEffect, useState } from "react";

/** Whole seconds left until `target` (epoch ms), or null when there is no target. */
export function useCountdown(target: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [target]);

  return target === null ? null : Math.max(0, Math.ceil((target - now) / 1000));
}
