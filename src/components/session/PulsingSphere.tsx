import { useEffect, useRef } from "react";
import type { BreathPhase } from "@/hooks/useBreathingPacer";

/**
 * Two independent layers:
 *  - outer: slow breath-synced scale (driven by phase changes only)
 *  - inner: fast heartbeat tick, created ONCE and re-rated via
 *    updatePlaybackRate() so live bpm updates never restart/snap it.
 */
export function PulsingSphere({
  phase,
  phaseDurationMs,
  bpm,
}: {
  phase: BreathPhase;
  phaseDurationMs: number;
  bpm: number;
}) {
  const breathRef = useRef<HTMLDivElement>(null);
  const beatRef = useRef<HTMLDivElement>(null);
  const beatAnimRef = useRef<Animation | null>(null);
  const breathAnimRef = useRef<Animation | null>(null);

  // Breath scale: ONE continuous sinusoidal cycle for the whole session, so
  // inhale flows into exhale with no restart, no easing reset, no velocity jump
  // at the turnaround. Phase changes only nudge it back into sync if it drifts.
  useEffect(() => {
    const el = breathRef.current;
    if (!el) return;
    const MIN = 0.7;
    const MAX = 1.4;
    const STEPS = 60; // sampled sine -> smooth accel/decel with linear playback
    const frames = Array.from({ length: STEPS + 1 }, (_, i) => {
      const p = i / STEPS; // 0 = start of inhale, 0.5 = peak, 1 = back to floor
      const eased = (1 - Math.cos(p * Math.PI * 2)) / 2;
      return {
        transform: `scale(${(MIN + (MAX - MIN) * eased).toFixed(4)})`,
        offset: p,
      };
    });
    const anim = el.animate(frames, {
      duration: phaseDurationMs * 2,
      iterations: Infinity,
      easing: "linear",
    });
    breathAnimRef.current = anim;
    return () => {
      anim.cancel();
      breathAnimRef.current = null;
    };
  }, [phaseDurationMs]);

  // Keep the loop aligned with the pacer without ever restarting it: if the
  // cycle has drifted from the phase boundary, ease the position back.
  useEffect(() => {
    const anim = breathAnimRef.current;
    if (!anim) return;
    const cycle = phaseDurationMs * 2;
    const target = phase === "in" ? 0 : phaseDurationMs;
    const current = Number(anim.currentTime ?? 0) % cycle;
    let drift = current - target;
    if (drift > cycle / 2) drift -= cycle;
    if (drift < -cycle / 2) drift += cycle;
    // Only correct meaningful drift, and correct gradually via playback rate
    // so the sphere never teleports mid-breath.
    if (Math.abs(drift) < 120) return;
    const correctionWindow = phaseDurationMs;
    const rate = Math.min(1.25, Math.max(0.75, 1 - drift / correctionWindow));
    anim.updatePlaybackRate(rate);
    const id = window.setTimeout(
      () => anim.updatePlaybackRate(1),
      correctionWindow,
    );
    return () => window.clearTimeout(id);
  }, [phase, phaseDurationMs]);


  // Heartbeat tick: one animation for the whole session.
  useEffect(() => {
    const el = beatRef.current;
    if (!el) return;
    const anim = el.animate(
      [
        { transform: "scale(1)", offset: 0 },
        { transform: "scale(1.07)", offset: 0.12 },
        { transform: "scale(0.985)", offset: 0.28 },
        { transform: "scale(1)", offset: 1 },
      ],
      { duration: 1000, iterations: Infinity, easing: "ease-out" },
    );
    beatAnimRef.current = anim;
    return () => anim.cancel();
  }, []);

  useEffect(() => {
    const safeBpm = Math.min(200, Math.max(30, bpm || 60));
    beatAnimRef.current?.updatePlaybackRate(safeBpm / 60);
  }, [bpm]);

  return (
    <div ref={breathRef} className="will-change-transform">
      <div ref={beatRef} className="will-change-transform">
        <div className="size-36 rounded-full bg-[image:var(--gradient-sphere)] shadow-[var(--shadow-glow)]">
          <div className="size-full rounded-full bg-[image:var(--gradient-sphere-sheen)]" />
        </div>
      </div>
    </div>
  );
}
