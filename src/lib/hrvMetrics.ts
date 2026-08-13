import type { Beat } from "./coherence";

export type HrvMetrics = {
  /** Number of valid RR intervals in the window. */
  count: number;
  /** Root mean square of successive differences (ms). */
  rmssd: number | null;
  /** Standard deviation of NN intervals (ms). */
  sdnn: number | null;
  /** Percentage of successive differences greater than 50 ms. */
  pnn50: number | null;
  /** Mean NN interval (ms). */
  meanRr: number | null;
  /** Low-frequency power (0.04–0.15 Hz), arbitrary units. */
  lf: number | null;
  /** High-frequency power (0.15–0.40 Hz), arbitrary units. */
  hf: number | null;
  /** LF/HF ratio; null until enough data for a stable estimate. */
  lfhf: number | null;
};

const EMPTY: HrvMetrics = {
  count: 0,
  rmssd: null,
  sdnn: null,
  pnn50: null,
  meanRr: null,
  lf: null,
  hf: null,
  lfhf: null,
};

const FS = 4; // Hz resampling rate for spectral estimates
const DF = 0.005;

/** Evenly resamples the RR tachogram (ms) at FS Hz; returns a detrended, Hann-windowed series. */
function prepareSeries(pts: { t: number; rr: number }[]): number[] | null {
  const start = pts[0]!.t;
  const end = pts[pts.length - 1]!.t;
  const span = end - start;
  if (span < 30) return null; // need ~30s for LF to be meaningful

  const n = Math.floor(span * FS);
  if (n < 16) return null;
  const series = new Array<number>(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = start + i / FS;
    while (j < pts.length - 2 && pts[j + 1]!.t < t) j++;
    const a = pts[j]!;
    const b = pts[Math.min(j + 1, pts.length - 1)]!;
    const dt = b.t - a.t;
    const f = dt > 0 ? (t - a.t) / dt : 0;
    series[i] = a.rr + (b.rr - a.rr) * Math.min(1, Math.max(0, f));
  }
  const mean = series.reduce((s, v) => s + v, 0) / n;
  return series.map(
    (v, i) => (v - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))),
  );
}

function bandPower(win: number[], lo: number, hi: number): number {
  const n = win.length;
  let total = 0;
  for (let f = lo; f <= hi + 1e-9; f += DF) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const ang = (2 * Math.PI * f * i) / FS;
      re += win[i]! * Math.cos(ang);
      im -= win[i]! * Math.sin(ang);
    }
    total += (re * re + im * im) / (n * n);
  }
  return total;
}

/**
 * Time- and frequency-domain HRV metrics over a rolling window of beats.
 * `windowSec` defaults to 120s, a common short-term analysis window.
 */
export function computeHrvMetrics(
  beats: Beat[],
  now = Date.now(),
  windowSec = 120,
): HrvMetrics {
  const from = now - windowSec * 1000;
  const valid = beats.filter(
    (b) => b.t >= from && b.rr > 300 && b.rr < 2000,
  );
  if (valid.length < 5) return { ...EMPTY, count: valid.length };

  const rr = valid.map((b) => b.rr);
  const meanRr = rr.reduce((s, v) => s + v, 0) / rr.length;
  const sdnn = Math.sqrt(
    rr.reduce((s, v) => s + (v - meanRr) ** 2, 0) / (rr.length - 1),
  );

  let sq = 0;
  let over50 = 0;
  for (let i = 1; i < rr.length; i++) {
    const d = rr[i]! - rr[i - 1]!;
    sq += d * d;
    if (Math.abs(d) > 50) over50++;
  }
  const diffs = rr.length - 1;
  const rmssd = Math.sqrt(sq / diffs);
  const pnn50 = (over50 / diffs) * 100;

  let lf: number | null = null;
  let hf: number | null = null;
  let lfhf: number | null = null;
  const win = prepareSeries(valid.map((b) => ({ t: b.t / 1000, rr: b.rr })));
  if (win) {
    lf = bandPower(win, 0.04, 0.15);
    hf = bandPower(win, 0.15, 0.4);
    lfhf = hf > 0 ? lf / hf : null;
  }

  return { count: valid.length, rmssd, sdnn, pnn50, meanRr, lf, hf, lfhf };
}
