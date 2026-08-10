import { useEffect, useRef, useState } from "react";
import { useHeartRateDevice, type HeartRateDevice } from "./useHeartRateDevice";
import { bpmFromBeats, coherenceFromBeats } from "@/lib/coherence";

export type HrvSample = { t: number; coherence: number; bpm: number };

export type HrvSession = {
  bpm: number;
  coherenceLive: number;
  history: HrvSample[];
  elapsedSec: number;
  /** True while no sensor is connected and values are simulated. */
  simulated: boolean;
  device: HeartRateDevice;
};

/**
 * Live HRV session.
 * When a BLE heart-rate sensor is connected, bpm and coherence come from the
 * device's RR intervals. Otherwise a gentle simulation keeps the UI alive.
 */
export function useHrvSession(): HrvSession {
  const device = useHeartRateDevice();
  const connected = device.status === "connected";

  const [state, setState] = useState<Omit<HrvSession, "simulated" | "device">>({
    bpm: 68,
    coherenceLive: 0.5,
    history: [],
    elapsedSec: 0,
  });
  const startRef = useRef<number>(Date.now());
  const deviceRef = useRef(device);
  deviceRef.current = device;

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => {
        const elapsedSec = Math.floor((Date.now() - startRef.current) / 1000);
        const dev = deviceRef.current;
        const isLive = dev.status === "connected";

        let bpm: number;
        let coherence: number;
        if (isLive) {
          bpm = dev.bpm || bpmFromBeats(dev.beats) || prev.bpm;
          const measured = coherenceFromBeats(dev.beats);
          // Ease towards the new reading so the ring/labels do not jitter.
          coherence = prev.coherenceLive + (measured - prev.coherenceLive) * 0.25;
        } else {
          bpm = Math.round(
            64 + 8 * Math.sin(elapsedSec / 9) + (Math.random() - 0.5) * 3,
          );
          coherence = Math.min(
            1,
            Math.max(
              0,
              0.5 + 0.4 * Math.sin(elapsedSec / 14) + (Math.random() - 0.5) * 0.12,
            ),
          );
        }

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

  // Restart the session clock and history when a sensor comes online.
  useEffect(() => {
    if (!connected) return;
    startRef.current = Date.now();
    setState((prev) => ({ ...prev, history: [], elapsedSec: 0 }));
  }, [connected]);

  return { ...state, simulated: !connected, device };
}
