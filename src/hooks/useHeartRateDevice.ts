import { useCallback, useEffect, useRef, useState } from "react";
import type { Beat } from "@/lib/coherence";

export type DeviceStatus =
  | "unsupported"
  | "idle"
  | "connecting"
  | "connected"
  | "error";

const HR_SERVICE = "heart_rate";
const HR_MEASUREMENT = "heart_rate_measurement";

type BluetoothLike = {
  requestDevice: (opts: unknown) => Promise<any>;
};

function getBluetooth(): BluetoothLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth ?? null;
}

/** Parses the standard BLE Heart Rate Measurement characteristic (0x2A37). */
export function parseHeartRateMeasurement(view: DataView) {
  const flags = view.getUint8(0);
  const hr16 = (flags & 0x01) !== 0;
  const hasEnergy = (flags & 0x08) !== 0;
  const hasRr = (flags & 0x10) !== 0;

  let offset = 1;
  const bpm = hr16 ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += hr16 ? 2 : 1;
  if (hasEnergy) offset += 2;

  const rrIntervals: number[] = [];
  if (hasRr) {
    for (; offset + 1 < view.byteLength; offset += 2) {
      // RR is expressed in 1/1024 s units.
      rrIntervals.push((view.getUint16(offset, true) / 1024) * 1000);
    }
  }
  return { bpm, rrIntervals };
}

export type HeartRateDevice = {
  status: DeviceStatus;
  deviceName: string | null;
  error: string | null;
  bpm: number;
  /** Rolling buffer of beats with RR intervals (ms). */
  beats: Beat[];
  /** True when the device reports RR intervals (required for real HRV). */
  hasRr: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

export function useHeartRateDevice(): HeartRateDevice {
  const [status, setStatus] = useState<DeviceStatus>("idle");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bpm, setBpm] = useState(0);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [hasRr, setHasRr] = useState(false);
  const deviceRef = useRef<any>(null);
  const charRef = useRef<any>(null);

  useEffect(() => {
    if (!getBluetooth()) setStatus("unsupported");
  }, []);

  const handleValue = useCallback((event: Event) => {
    const view = (event.target as { value?: DataView }).value;
    if (!view) return;
    const { bpm: hr, rrIntervals } = parseHeartRateMeasurement(view);
    if (hr > 0) setBpm(hr);

    const now = Date.now();
    if (rrIntervals.length) {
      setHasRr(true);
      const total = rrIntervals.reduce((s, v) => s + v, 0);
      let cursor = now - total;
      const incoming: Beat[] = rrIntervals.map((rr) => {
        cursor += rr;
        return { t: cursor, rr };
      });
      setBeats((prev) => [...prev, ...incoming].slice(-600));
    } else if (hr > 0) {
      // Fall back to synthesising a beat from BPM so coherence stays defined.
      setBeats((prev) => [...prev, { t: now, rr: 60000 / hr }].slice(-600));
    }
  }, []);

  const cleanup = useCallback(() => {
    charRef.current?.removeEventListener?.(
      "characteristicvaluechanged",
      handleValue,
    );
    try {
      charRef.current?.stopNotifications?.();
    } catch {
      /* device already gone */
    }
    try {
      deviceRef.current?.gatt?.disconnect?.();
    } catch {
      /* ignore */
    }
    charRef.current = null;
    deviceRef.current = null;
  }, [handleValue]);

  const connect = useCallback(async () => {
    const bluetooth = getBluetooth();
    if (!bluetooth) {
      setStatus("unsupported");
      setError("Pelayar ini tidak menyokong Web Bluetooth.");
      return;
    }
    setError(null);
    setStatus("connecting");
    try {
      const device = await bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE] }],
        optionalServices: [HR_SERVICE, "battery_service"],
      });
      deviceRef.current = device;
      setDeviceName(device.name ?? "Peranti HR");
      device.addEventListener?.("gattserverdisconnected", () => {
        setStatus("idle");
        setBpm(0);
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HR_SERVICE);
      const characteristic = await service.getCharacteristic(HR_MEASUREMENT);
      charRef.current = characteristic;
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleValue,
      );
      await characteristic.startNotifications();
      setStatus("connected");
    } catch (e) {
      cleanup();
      const message = e instanceof Error ? e.message : String(e);
      // A user cancelling the chooser is not an error worth shouting about.
      setStatus(/cancel|User cancelled/i.test(message) ? "idle" : "error");
      if (!/cancel|User cancelled/i.test(message)) setError(message);
    }
  }, [cleanup, handleValue]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus("idle");
    setDeviceName(null);
    setBpm(0);
    setBeats([]);
    setHasRr(false);
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return {
    status,
    deviceName,
    error,
    bpm,
    beats,
    hasRr,
    connect,
    disconnect,
  };
}
