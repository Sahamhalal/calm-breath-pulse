import { useEffect, useRef, useState } from "react";

export type HrvSample = { t: number; coherence: number; bpm: number };

export type HrvSession = {
  bpm: number;
  coherenceLive: number;
  history: HrvSample[];
  elapsedSec: number;
};

/**
 * Placeholder for the real Bluetooth HR sensor hook.
 * Emits a new sample roughly once per second, like real hardware.
 */
export function useHrvSession(): HrvSession {
  const [state, setState] = useState<HrvSession>({
    bpm: 68,
    coherenceLive: 0.5,
    history: [],
    elapsedSec: 0,
  });
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => {
        const elapsedSec = Math.floor((Date.now() - startRef.current) / 1000);
        const bpm = Math.round(
          64 + 8 * Math.sin(elapsedSec / 9) + (Math.random() - 0.5) * 3,
        );
        const coherence = Math.min(
          1,
          Math.max(
            0,
            0.5 + 0.4 * Math.sin(elapsedSec / 14) + (Math.random() - 0.5) * 0.12,
          ),
        );
        const sample: HrvSample = { t: elapsedSec, coherence, bpm };
        return {
          bpm,
          coherenceLive: coherence,
          history: [...prev.history, sample].slice(-600),
          elapsedSec,
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return state;
}
