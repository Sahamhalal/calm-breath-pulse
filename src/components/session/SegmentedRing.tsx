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
          const angle = (i / SEGMENT_COUNT) * 360 - 90;
          return (
            <rect
              key={i}
              x={c + radius - segH / 2}
              y={c - segW / 2}
              width={segH}
              height={segW}
              rx={segW / 2}
              fill={ZONE_FILL[zone]}
              transform={`rotate(${angle} ${c} ${c})`}
              style={{ transition: "fill 600ms ease-out" }}
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
