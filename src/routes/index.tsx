import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { X, HeartPulse } from "lucide-react";
import { useHrvSession } from "@/hooks/useHrvSession";
import { useBreathingPacer } from "@/hooks/useBreathingPacer";
import { WaveformStrip } from "@/components/session/WaveformStrip";
import {
  SegmentedRing,
  SEGMENT_COUNT,
  NOMINAL_SESSION_SEC,
  zoneFor,
  type Zone,
} from "@/components/session/SegmentedRing";
import { PulsingSphere } from "@/components/session/PulsingSphere";
import { SmoothnessSetting } from "@/components/session/SmoothnessSetting";
import { DeviceConnect } from "@/components/session/DeviceConnect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sesi Nafas HRV — Biofeedback Koheren" },
      {
        name: "description",
        content:
          "Sesi biofeedback pernafasan langsung: pacer 5s tarik / 5s hembus, skor koheren HRV dan gelombang denyutan masa nyata.",
      },
      { property: "og:title", content: "Sesi Nafas HRV — Biofeedback Koheren" },
      {
        property: "og:description",
        content:
          "Bernafas mengikut pacer, pantau skor koheren dan denyutan jantung anda secara langsung.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionScreen,
});

function useLockedZones(elapsedSec: number, coherenceLive: number) {
  const [zones, setZones] = useState<Zone[]>(() =>
    Array<Zone>(SEGMENT_COUNT).fill("idle"),
  );
  const coherenceRef = useRef(coherenceLive);
  coherenceRef.current = coherenceLive;

  useEffect(() => {
    const secPerSegment = NOMINAL_SESSION_SEC / SEGMENT_COUNT;
    const reached = Math.min(
      SEGMENT_COUNT,
      Math.floor(elapsedSec / secPerSegment) + (elapsedSec > 0 ? 1 : 0),
    );
    setZones((prev) => {
      if (reached === 0) return prev;
      let changed = false;
      const next = prev.slice();
      for (let i = 0; i < reached; i++) {
        if (next[i] === "idle") {
          next[i] = zoneFor(coherenceRef.current);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [elapsedSec]);

  return zones;
}

function SessionScreen() {
  const { bpm, coherenceLive, elapsedSec, simulated, device } = useHrvSession();
  const { phase, phaseDurationMs, breathCount } = useBreathingPacer();
  const zones = useLockedZones(elapsedSec, coherenceLive);
  const [smoothness, setSmoothness] = useState(1);


  return (
    <main className="flex min-h-screen flex-col bg-[image:var(--gradient-calm)] px-6 py-6">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2 rounded-full bg-card/70 px-4 py-2 shadow-[var(--shadow-soft)] backdrop-blur">
          <HeartPulse className="size-4 text-destructive" aria-hidden />
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {bpm}
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            bpm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SmoothnessSetting value={smoothness} onChange={setSmoothness} />
          <button
            type="button"
            aria-label="Tutup sesi"
            className="grid size-10 place-items-center rounded-full bg-card/70 text-muted-foreground shadow-[var(--shadow-soft)] backdrop-blur transition-colors hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      <h1 className="sr-only">Sesi biofeedback pernafasan HRV</h1>

      <WaveformStrip bpm={bpm} />

      <section className="flex flex-1 flex-col items-center justify-center gap-8">
        <SegmentedRing zones={zones}>
          <PulsingSphere
            phase={phase}
            phaseDurationMs={phaseDurationMs}
            bpm={bpm}
            smoothness={smoothness}
          />
        </SegmentedRing>

        <div className="text-center">
          <p
            aria-live="polite"
            className="text-2xl font-medium tracking-wide text-foreground"
          >
            {phase === "in" ? "Tarik Nafas" : "Hembus Nafas"}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Skor koheren{" "}
            <span className="font-semibold tabular-nums text-primary">
              {(coherenceLive * 100).toFixed(0)}
            </span>
            <span className="text-muted-foreground">/100</span>
          </p>
        </div>
      </section>

      <footer className="pb-2 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
          Nafas ke-{breathCount}
        </p>
      </footer>
    </main>
  );
}
