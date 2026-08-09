import { useEffect, useState } from "react";

export const PHASE_DURATION_MS = 5000;

export type BreathPhase = "in" | "out";

export type BreathingPacer = {
  phase: BreathPhase;
  phaseDurationMs: number;
  /** Number of completed-or-current inhales, i.e. "Nafas ke-N". */
  breathCount: number;
};

/** Placeholder pacer: fixed 5s inhale / 5s exhale. */
export function useBreathingPacer(): BreathingPacer {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), PHASE_DURATION_MS);
    return () => window.clearInterval(id);
  }, []);

  return {
    phase: tick % 2 === 0 ? "in" : "out",
    phaseDurationMs: PHASE_DURATION_MS,
    breathCount: Math.floor(tick / 2) + 1,
  };
}
