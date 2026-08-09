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

  // Breath scale: retargeted only when the phase flips (never from bpm).
  useEffect(() => {
    const el = breathRef.current;
    if (!el) return;
    const from = getComputedStyle(el).transform;
    const to = phase === "in" ? "scale(1.4)" : "scale(0.7)";
    const anim = el.animate(
      [{ transform: from === "none" ? "scale(1)" : from }, { transform: to }],
      {
        duration: phaseDurationMs,
        easing: "cubic-bezier(0.37, 0, 0.63, 1)",
        fill: "forwards",
      },
    );
    return () => {
      anim.commitStyles();
      anim.cancel();
    };
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
