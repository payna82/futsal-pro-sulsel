import { useEffect, useRef, useState } from "react";
import { PERIOD_DURATION_SECONDS } from "@/domain/match-state";

/**
 * Jam pertandingan sisi klien untuk operator.
 * Nilai otoritatif akan berasal dari backend (event PERIOD_START/PERIOD_END).
 */
export function useMatchClock(initialSeconds: number, autoRun = false) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(autoRun);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setSeconds((s) => Math.min(PERIOD_DURATION_SECONDS, s + 1));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  return {
    seconds,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    toggle: () => setRunning((r) => !r),
    reset: (value = 0) => {
      setRunning(false);
      setSeconds(value);
    },
    adjust: (delta: number) =>
      setSeconds((s) => Math.max(0, Math.min(PERIOD_DURATION_SECONDS, s + delta))),
  };
}
