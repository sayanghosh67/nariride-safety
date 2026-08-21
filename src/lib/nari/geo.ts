import type { LatLng } from "./types";

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Local planar projection (metres) around an origin — accurate enough for city scale. */
function project(p: LatLng, origin: LatLng) {
  const x = toRad(p.lng - origin.lng) * R * Math.cos(toRad(origin.lat));
  const y = toRad(p.lat - origin.lat) * R;
  return { x, y };
}

function unproject(x: number, y: number, origin: LatLng): LatLng {
  return {
    lat: origin.lat + toDeg(y / R),
    lng: origin.lng + toDeg(x / (R * Math.cos(toRad(origin.lat)))),
  };
}

/** Shortest distance (m) from a point to a polyline. */
export function distanceToRoute(point: LatLng, route: LatLng[]): number {
  if (route.length === 0) return 0;
  if (route.length === 1) return haversine(point, route[0]!);
  const origin = route[0]!;
  const p = project(point, origin);
  let best = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const a = project(route[i]!, origin);
    const b = project(route[i + 1]!, origin);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * dx;
    const cy = a.y + t * dy;
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < best) best = d;
  }
  return best;
}

export function routeLength(route: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) total += haversine(route[i]!, route[i + 1]!);
  return total;
}

/** Point at fraction t (0..1) along a polyline, plus a perpendicular offset in metres. */
export function pointAlongRoute(route: LatLng[], t: number, offsetMeters = 0): LatLng {
  const clamped = Math.max(0, Math.min(1, t));
  const total = routeLength(route);
  const target = total * clamped;
  let walked = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]!;
    const b = route[i + 1]!;
    const seg = haversine(a, b);
    if (walked + seg >= target || i === route.length - 2) {
      const f = seg === 0 ? 0 : (target - walked) / seg;
      const origin = a;
      const pb = project(b, origin);
      const x = pb.x * f;
      const y = pb.y * f;
      if (offsetMeters === 0) return unproject(x, y, origin);
      const len = Math.hypot(pb.x, pb.y) || 1;
      const nx = -pb.y / len;
      const ny = pb.x / len;
      return unproject(x + nx * offsetMeters, y + ny * offsetMeters, origin);
    }
    walked += seg;
  }
  return route[route.length - 1]!;
}

/** Deterministic pseudo-random noise generator (mulberry32). */
export function seededNoise(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}

/** Builds a plausible curved road-like route between two points. */
export function buildRoute(from: LatLng, to: LatLng, seed = 7, steps = 48): LatLng[] {
  const origin = from;
  const end = project(to, origin);
  const pts: LatLng[] = [];
  const curve = 0.16 + (Math.abs(seededNoise(seed)) * 0.12);
  const dir = seededNoise(seed + 3) > 0 ? 1 : -1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bend = Math.sin(t * Math.PI) * curve * dir;
    const zig = Math.sin(t * Math.PI * 5) * 0.018 * dir;
    const x = end.x * t + (-end.y) * (bend + zig);
    const y = end.y * t + end.x * (bend + zig);
    pts.push(unproject(x, y, origin));
  }
  return pts;
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatCoords(p: LatLng | null): string {
  if (!p) return "Location unavailable";
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}
