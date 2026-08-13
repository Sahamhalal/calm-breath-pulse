export const SEGMENT_COUNT = 40;
export const NOMINAL_SESSION_SEC = 180;

export type Zone = "low" | "mid" | "high" | "idle";

export function zoneFor(coherence: number): Zone {
  if (coherence < 0.34) return "low";
  if (coherence < 0.67) return "mid";
  return "high";
}

const ZONE_FILL: Record<Zone, string> = {
  idle: "var(--ring-track)",
  low: "var(--zone-low)",
  mid: "var(--zone-mid)",
  high: "var(--zone-high)",
};

export type ZoneCounts = { low: number; mid: number; high: number };

/**
 * Turn accumulated zone samples into an ordered list of segment colors:
 * the dominant zone owns the largest contiguous arc, then the next, etc.
 * Unused segments stay on the neutral track.
 */
export function dominanceZones(
  counts: ZoneCounts,
  segments = SEGMENT_COUNT,
): Zone[] {
  const total = counts.low + counts.mid + counts.high;
  if (total <= 0) return Array<Zone>(segments).fill("idle");

  const ordered = (["high", "mid", "low"] as const)
    .map((z) => ({ zone: z as Zone, count: counts[z] }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  const raw = ordered.map((e) => (e.count / total) * segments);
  const sizes = raw.map((v) => Math.floor(v));
  let left = segments - sizes.reduce((a, b) => a + b, 0);
  const rema = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0 && rema.length; k++, left--) {
    sizes[rema[k % rema.length].i]++;
  }

  const out: Zone[] = [];
  ordered.forEach((e, i) => {
    for (let n = 0; n < sizes[i]; n++) out.push(e.zone);
  });
  while (out.length < segments) out.push("idle");
  return out.slice(0, segments);
}

/** Gauge layout: two arcs with small open gaps at the top and the bottom. */
function angleForIndex(i: number, count: number) {
  const half = count / 2;
  const sweep = 164; // degrees covered per side
  const gapStart = 8; // degrees of open space either side of top/bottom
  const step = sweep / (half - 1);
  return i < half
    ? gapStart + i * step
    : 180 + gapStart + (i - half) * step;
}

export function SegmentedRing({
  zones,
  children,
}: {
  zones: Zone[];
  children?: React.ReactNode;
}) {
  const size = 320;
  const c = size / 2;
  const radius = 138;
  const segW = 7;
  const segH = 18;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {zones.map((zone, i) => {
          const angle = angleForIndex(i, zones.length) - 90;
          return (
            <rect
              key={i}
              x={c + radius - segH / 2}
              y={c - segW / 2}
              width={segH}
              height={segW}
              rx={segW / 2}
              fill={ZONE_FILL[zone]}
              opacity={zone === "idle" ? 0.55 : 1}
              transform={`rotate(${angle} ${c} ${c})`}
              style={{ transition: "fill 600ms ease-out, opacity 600ms ease-out" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
