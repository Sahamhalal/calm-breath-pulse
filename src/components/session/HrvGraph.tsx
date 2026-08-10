import { useEffect, useRef, useState } from "react";
import type { Beat } from "@/lib/coherence";

const WINDOW_SEC = 60;
const VB_W = 1000;
const VB_H = 120;

/**
 * Real HRV tachogram: instantaneous heart rate (60000 / RR) plotted per beat
 * across a rolling 60-second window, scrolling right-to-left in real time.
 */
export function HrvGraph({ beats }: { beats: Beat[] }) {
  const [now, setNow] = useState(() => Date.now());
  const rafRef = useRef<number>(0);

  // Smooth scrolling: advance the right edge every frame, independent of the
  // 1 Hz sample cadence, so the trace glides rather than steps.
  useEffect(() => {
    const loop = () => {
      setNow(Date.now());
      rafRef.current = window.requestAnimationFrame(loop);
    };
    rafRef.current = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, []);

  const from = now - WINDOW_SEC * 1000;
  const pts = beats
    .filter((b) => b.t >= from - 2000 && b.rr > 300 && b.rr < 2000)
    .map((b) => ({ t: b.t, hr: 60000 / b.rr }));

  let path = "";
  let area = "";
  let lo = 0;
  let hi = 0;
  if (pts.length > 1) {
    const hrs = pts.map((p) => p.hr);
    const min = Math.min(...hrs);
    const max = Math.max(...hrs);
    const pad = Math.max(3, (max - min) * 0.25);
    lo = min - pad;
    hi = max + pad;
    const x = (t: number) => ((t - from) / (WINDOW_SEC * 1000)) * VB_W;
    const y = (hr: number) => VB_H - ((hr - lo) / (hi - lo || 1)) * VB_H;

    const coords = pts.map((p) => [x(p.t), y(p.hr)] as const);
    // Catmull-Rom-ish smoothing keeps beat detail without jagged corners.
    path = `M ${coords[0]![0].toFixed(1)} ${coords[0]![1].toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = coords[i - 1]!;
      const [cx, cy] = coords[i]!;
      const mx = (px + cx) / 2;
      path += ` C ${mx.toFixed(1)} ${py.toFixed(1)}, ${mx.toFixed(1)} ${cy.toFixed(1)}, ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
    const last = coords[coords.length - 1]!;
    area = `${path} L ${last[0].toFixed(1)} ${VB_H} L ${coords[0]![0].toFixed(1)} ${VB_H} Z`;
  }

  return (
    <div className="relative h-28 w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="h-full w-full text-primary"
        role="img"
        aria-label="Graf HRV langsung: kadar denyutan sesaat"
      >
        <defs>
          <linearGradient id="hrv-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={0}
            x2={VB_W}
            y1={VB_H * g}
            y2={VB_H * g}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        ))}
        {area && <path d={area} fill="url(#hrv-fill)" />}
        {path && (
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 z-20 text-[10px] uppercase tracking-widest text-muted-foreground">
        HRV · {WINDOW_SEC}s
      </div>
      {pts.length > 1 && (
        <div className="pointer-events-none absolute right-1 top-0 z-20 text-[10px] tabular-nums text-muted-foreground">
          {Math.round(hi)}–{Math.round(lo)} bpm
        </div>
      )}
    </div>
  );
}
