import { useEffect, useState } from "react";
import { computeHrvMetrics } from "@/lib/hrvMetrics";
import type { Beat } from "@/lib/coherence";

function Metric({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div
      className="flex min-w-20 flex-col items-center rounded-xl bg-card/70 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur"
      title={hint}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-semibold tabular-nums text-foreground">
        {value}
        {unit && (
          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

/** Live time- and frequency-domain HRV metrics from the rolling RR history. */
export function HrvMetrics({ beats }: { beats: Beat[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const m = computeHrvMetrics(beats, Date.now());
  void tick;

  const fmt = (v: number | null, digits = 0) =>
    v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);

  return (
    <section
      aria-label="Metrik HRV masa nyata"
      className="mt-2 flex flex-wrap items-center justify-center gap-2"
    >
      <Metric
        label="RMSSD"
        value={fmt(m.rmssd)}
        unit="ms"
        hint="Variasi denyut-ke-denyut (nada parasimpatetik)"
      />
      <Metric
        label="SDNN"
        value={fmt(m.sdnn)}
        unit="ms"
        hint="Sisihan piawai selang NN"
      />
      <Metric label="pNN50" value={fmt(m.pnn50)} unit="%" />
      <Metric
        label="LF/HF"
        value={fmt(m.lfhf, 2)}
        hint="Nisbah kuasa frekuensi rendah kepada tinggi"
      />
      <Metric label="Mean RR" value={fmt(m.meanRr)} unit="ms" />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {m.count} denyut
      </span>
    </section>
  );
}
