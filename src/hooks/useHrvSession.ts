import { useEffect, useRef, useState } from "react";
import { useHeartRateDevice, type HeartRateDevice } from "./useHeartRateDevice";
import { bpmFromBeats, coherenceFromBeats, type Beat } from "@/lib/coherence";

export type HrvSample = { t: number; coherence: number; bpm: number };

export type HrvSession = {
  bpm: number;
  coherenceLive: number;
  history: HrvSample[];
  /** Beat-to-beat intervals used to draw the live HRV tachogram. */
  beats: Beat[];
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

  const [state, setState] = useState<
    Omit<HrvSession, "simulated" | "device" | "beats">
  >({
    bpm: 68,
    coherenceLive: 0.5,
    history: [],
    elapsedSec: 0,
  });
  // Beats generated while no sensor is attached, so the graph stays real-shaped.
  const [simBeats, setSimBeats] = useState<Beat[]>([]);
  const simCursorRef = useRef<number>(Date.now());
  const startRef = useRef<number>(Date.now());
  const deviceRef = useRef(device);
  deviceRef.current = device;

  useEffect(() => {
    const id = window.setInterval(() => {
      const dev = deviceRef.current;
      const isLive = dev.status === "connected";
      const now = Date.now();
      const elapsedSec = Math.floor((now - startRef.current) / 1000);

      if (!isLive) {
        // Emit individual simulated beats with respiratory sinus arrhythmia so
        // the tachogram shows a genuine beat-to-beat interval series.
        setSimBeats((prev) => {
          const next = prev.slice();
          if (simCursorRef.current < now - 5000) simCursorRef.current = now - 1000;
          let guard = 0;
          while (simCursorRef.current < now && guard++ < 10) {
            const s = (simCursorRef.current - startRef.current) / 1000;
            const baseBpm = 64 + 4 * Math.sin(s / 9);
            const rsa = 5 * Math.sin((s / 10) * Math.PI * 2); // 10s breath cycle
            const bpmNow = baseBpm + rsa + (Math.random() - 0.5) * 1.5;
            const rr = 60000 / bpmNow;
            simCursorRef.current += rr;
            next.push({ t: simCursorRef.current, rr });
          }
          return next.slice(-600);
        });
      }

      setState((prev) => {
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
    setSimBeats([]);
  }, [connected]);

  return {
    ...state,
    beats: connected ? device.beats : simBeats,
    simulated: !connected,
    device,
  };
}
