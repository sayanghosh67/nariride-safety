import type { Driver, EmergencyContact, PoliceStation, SafetySettings } from "./types";

export const PLACES: { label: string; lat: number; lng: number; tag: string }[] = [
  { label: "New Town, Kolkata", lat: 22.5807, lng: 88.4637, tag: "Home" },
  { label: "UEM Kolkata, Jagannathpur", lat: 22.5602, lng: 88.4901, tag: "College" },
  { label: "Sector V, Salt Lake", lat: 22.5766, lng: 88.4318, tag: "Office" },
  { label: "Eco Park Gate 1", lat: 22.6015, lng: 88.4633, tag: "Landmark" },
  { label: "Rajarhat Chowmatha", lat: 22.6127, lng: 88.4472, tag: "Landmark" },
  { label: "Howrah Station", lat: 22.5839, lng: 88.3425, tag: "Transit" },
  { label: "Park Street Metro", lat: 22.5525, lng: 88.3527, tag: "Transit" },
  { label: "Baguiati Crossing", lat: 22.6083, lng: 88.4237, tag: "Landmark" },
];

export const DEMO_PICKUP = PLACES[0]!;
export const DEMO_DESTINATION = PLACES[1]!;

export const RIDE_TYPES = [
  { id: "solo", label: "NariSolo", detail: "Single passenger, verified driver pool" },
  { id: "shared", label: "NariShare", detail: "Shared with other women passengers" },
  { id: "night", label: "NariNight", detail: "Late-shift escort with enhanced monitoring" },
];

const DEMO_DRIVERS: Driver[] = [
  { name: "Demo Driver — R. Mondal", rating: 4.8, vehicle: "Demo Vehicle · Maruti Dzire", vehicleNumber: "WB-DEMO-0142", avatarSeed: "rm", demo: true },
  { name: "Demo Driver — S. Bakshi", rating: 4.6, vehicle: "Demo Vehicle · Hyundai Aura", vehicleNumber: "WB-DEMO-0788", avatarSeed: "sb", demo: true },
  { name: "Demo Driver — A. Haldar", rating: 4.9, vehicle: "Demo Vehicle · Tata Tigor", vehicleNumber: "WB-DEMO-0311", avatarSeed: "ah", demo: true },
];

/** Deterministic driver assignment from the ride id. */
export function assignDriver(rideId: string): Driver {
  const sum = [...rideId].reduce((a, c) => a + c.charCodeAt(0), 0);
  return DEMO_DRIVERS[sum % DEMO_DRIVERS.length]!;
}

/** Clearly labelled demo police-station dataset (no real phone numbers). */
export const DEMO_POLICE_STATIONS: PoliceStation[] = [
  { id: "ps-1", name: "New Town Police Station (demo record)", lat: 22.5828, lng: 88.4585, demo: true },
  { id: "ps-2", name: "Techno City Police Station (demo record)", lat: 22.5541, lng: 88.4838, demo: true },
  { id: "ps-3", name: "Eco Park Outpost (demo record)", lat: 22.5993, lng: 88.4642, demo: true },
  { id: "ps-4", name: "Baguiati Police Station (demo record)", lat: 22.6087, lng: 88.4262, demo: true },
  { id: "ps-5", name: "Bidhannagar East Police Station (demo record)", lat: 22.5794, lng: 88.4271, demo: true },
];

export const DEFAULT_SETTINGS: SafetySettings = {
  nightModeEnabled: true,
  nightStart: 22,
  nightEnd: 6,
  trustedJourneyDefault: true,
  deviationThresholds: { monitoring: 50, caution: 150, highRisk: 250, critical: 400 },
  graceSeconds: 20,
  arrivalTimeoutSeconds: 120,
  notifyOnCaution: true,
  shareLiveLocation: true,
  reducedMotion: false,
};

export const SAMPLE_CONTACTS: EmergencyContact[] = [
  { id: "c-1", name: "Ma", relationship: "Mother", phone: "+91 90000 00001", primary: true },
  { id: "c-2", name: "Ananya", relationship: "Friend", phone: "+91 90000 00002" },
];

export function isNightNow(settings: SafetySettings, at = new Date()): boolean {
  if (!settings.nightModeEnabled) return false;
  const h = at.getHours();
  const { nightStart, nightEnd } = settings;
  return nightStart <= nightEnd ? h >= nightStart && h < nightEnd : h >= nightStart || h < nightEnd;
}

export function greeting(at = new Date()): string {
  const h = at.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Travelling late";
}

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${rand}`;
}

export function makePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Lightweight, non-reversible hash. Demo-only credential storage — never production auth. */
export async function hashPassword(pw: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`nariride:${pw}`));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0;
  for (const ch of `nariride:${pw}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `fallback-${h}`;
}
