import { bearing, haversine, pointAlongRoute, seededNoise } from "./geo";
import type { LatLng, LocationPoint } from "./types";

export type SimMode = "normal" | "minor" | "suspicious" | "severe" | "return" | "arrive" | "paused";

export const SIM_OFFSET: Record<Exclude<SimMode, "paused">, number> = {
  normal: 0,
  minor: 95,
  suspicious: 215,
  severe: 520,
  return: 0,
  arrive: 0,
};

export type SimState = {
  tick: number;
  progress: number;
  offset: number;
  mode: SimMode;
};

export const initialSimState: SimState = { tick: 0, progress: 0, offset: 0, mode: "paused" };

/**
 * Deterministic GPS simulator. Given a route and the previous state it produces the
 * next location point exactly as a real GPS stream would deliver it.
 */
export function stepSimulation(
  route: LatLng[],
  state: SimState,
  previous: LocationPoint | null,
  now: number,
): { state: SimState; point: LocationPoint } {
  const tick = state.tick + 1;
  const target = state.mode === "paused" ? state.offset : SIM_OFFSET[state.mode];
  // Smooth offset transitions so a single tick never jumps the vehicle.
  const offset = state.offset + (target - state.offset) * 0.35;

  let progress = state.progress;
  if (state.mode === "arrive") progress = Math.min(1, progress + 0.14);
  else if (state.mode === "severe") progress = Math.max(0.05, progress - 0.012); // drifts away from destination
  else if (state.mode === "paused") progress = progress;
  else progress = Math.min(0.97, progress + 0.028);

  const jitter = seededNoise(tick * 13) * 6;
  const position = pointAlongRoute(route, progress, offset + jitter);
  const accuracy = 8 + Math.abs(seededNoise(tick * 7)) * 14;
  const elapsed = previous ? Math.max(1, (now - previous.timestamp) / 1000) : 3;
  const moved = previous ? haversine(previous, position) : 0;
  const speed = state.mode === "paused" ? 0 : moved / elapsed;

  const point: LocationPoint = {
    ...position,
    accuracy,
    timestamp: now,
    speed,
    heading: previous ? bearing(previous, position) : 0,
    source: "simulated",
  };

  return { state: { tick, progress, offset, mode: state.mode }, point };
}

export const SIM_LABELS: Record<SimMode, string> = {
  paused: "Paused",
  normal: "Normal route",
  minor: "Minor deviation",
  suspicious: "Suspicious deviation",
  severe: "Severe deviation",
  return: "Returning to route",
  arrive: "Approaching destination",
};
