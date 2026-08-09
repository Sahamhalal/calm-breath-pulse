# Calm Wave Monitor

Build the first page ("Skrin 1") of a breathing/HRV biofeedback session screen, in React + TypeScript, styled with a light teal/blue calming theme. This receives live heart-rate data from a Bluetooth HR sensor (assume a hook useHrvSession() already exists, providing: bpm: number, coherenceLive: number (0–1 range), history: {t: number, coherence: number, bpm: number}[], elapsedSec: number) and a breathing pacer hook useBreathingPacer() providing phase: 'in' | 'out' and phaseDurationMs: number (fixed at 5000ms per phase, i.e. 5s inhale / 5s exhale).

Layout, top to bottom:

A live BPM badge (top-left) and close button (top-right)

A scrolling HRV waveform strip — a repeating illustrative "blip" shape scrolling right-to-left, speed tied to bpm (faster heart rate = faster scroll, but keep overall pace calm — apply roughly a 0.5x speed dampening factor)

A center visual: a segmented ring (40 discrete tick marks around a circle, each its own small rectangle/box shape with visible gaps between neighbors — NOT one continuous curved stroke) surrounding a pulsing sphere

Below: a breath-phase label ("Tarik Nafas" / "Hembus Nafas" — Bahasa Melayu for inhale/exhale) and a live coherence score readout

A breath counter ("Nafas ke-N")

Ring behavior: Divide the ring into 40 segments across a nominal session length (e.g. 180s). Each segment "locks in" a color once its time window is reached, based on the most recent coherence sample's zone at that point: low coherence (<0.34) = red, medium (0.34–0.67) = blue, high (≥0.67) = green. Unreached segments stay a neutral gray/light track color.

Sphere animation — two layered, independently-timed effects:

A slow scale pulse synced to breath phase (roughly 1.4x on inhale peak, 0.7x on exhale, transitioning smoothly over the 5s phase duration)

A fast, subtle "heartbeat" tick synced to each beat (brief scale bump, period = 60/bpm seconds)

Critical implementation note — avoid a known animation bug: Do NOT drive either animation via a CSS animation or transition duration that gets recomputed from live bpm on every React render. Live BPM updates roughly once per second from real hardware, and recomputing a CSS animation's duration on every value change causes the browser to reinterpret already-elapsed time against the new duration — producing visible jumps/snaps/pops instead of smooth motion, especially bad for a keyframe animation with a brief peak (that peak can suddenly appear or vanish rather than transition into view). Instead, use the Web Animations API directly: create the animation once with element.animate(), and adjust its speed via animation.updatePlaybackRate() when bpm changes — this preserves continuous playback position rather than restarting the time interpretation.

Please implement this now, and briefly note any design decisions you made where the spec was ambiguous.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://calm-breath-pulse.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6f45025e-12c0-41a7-b656-dcda0e29ecc6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
