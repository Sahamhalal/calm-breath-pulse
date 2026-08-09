import { useEffect, useRef } from "react";

/** One illustrative HRV "blip" repeated across a tiling SVG. */
const TILE = 160;

function Blip({ x }: { x: number }) {
  return (
    <path
      d={`M ${x} 60 L ${x + 40} 60 L ${x + 52} 30 L ${x + 62} 92 L ${x + 72} 20 L ${x + 82} 66 L ${x + 96} 60 L ${x + TILE} 60`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/**
 * Scrolls right-to-left. The animation is created ONCE; bpm changes only
 * adjust playbackRate so elapsed playback position is preserved (no snapping).
 */
export function WaveformStrip({ bpm }: { bpm: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const anim = el.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(-${TILE}px)` }],
      { duration: 2000, iterations: Infinity, easing: "linear" },
    );
    animRef.current = anim;
    return () => anim.cancel();
  }, []);

  useEffect(() => {
    // 0.5x dampening keeps the pace calm even at high heart rates.
    const rate = Math.max(0.2, (bpm / 60) * 0.5);
    animRef.current?.updatePlaybackRate(rate);
  }, [bpm]);

  return (
    <div className="relative h-28 w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div ref={trackRef} className="absolute inset-y-0 left-0 w-[200%]">
        <svg
          viewBox="0 0 1600 120"
          preserveAspectRatio="none"
          className="h-full w-full text-primary/70"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <Blip key={i} x={i * TILE} />
          ))}
        </svg>
      </div>
    </div>
  );
}
