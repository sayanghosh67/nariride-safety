/**
 * Fare engine — Rapido-style vehicle classes with a transparent, deterministic breakdown.
 * Zero-cost: all pricing is computed locally, no pricing API is contacted.
 */

export type VehicleClassId = "bike" | "auto" | "cab" | "prime";

export type VehicleClass = {
  id: VehicleClassId;
  label: string;
  detail: string;
  seats: number;
  base: number;
  perKm: number;
  minFare: number;
  /** Average speed used for the ETA estimate (km/h). */
  speedKmh: number;
};

export const VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: "bike",
    label: "Nari Bike",
    detail: "Women captains only · fastest through traffic",
    seats: 1,
    base: 15,
    perKm: 6,
    minFare: 25,
    speedKmh: 26,
  },
  {
    id: "auto",
    label: "Nari Auto",
    detail: "Shared-cabin comfort with live monitoring",
    seats: 3,
    base: 25,
    perKm: 11,
    minFare: 40,
    speedKmh: 22,
  },
  {
    id: "cab",
    label: "Nari Cab",
    detail: "AC hatchback · verified women-first drivers",
    seats: 4,
    base: 45,
    perKm: 16,
    minFare: 75,
    speedKmh: 24,
  },
  {
    id: "prime",
    label: "Nari Prime",
    detail: "Sedan · top-rated captains, night escort ready",
    seats: 4,
    base: 65,
    perKm: 21,
    minFare: 110,
    speedKmh: 25,
  },
];

export function vehicleClass(id: string): VehicleClass {
  return VEHICLE_CLASSES.find((v) => v.id === id) ?? VEHICLE_CLASSES[1]!;
}

export type PaymentMethod = "CASH" | "UPI";
export type PaymentStatus = "PENDING" | "PAID";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; detail: string }[] = [
  { id: "CASH", label: "Cash", detail: "Pay the captain directly at drop" },
  { id: "UPI", label: "UPI", detail: "Confirm payment in-app after the trip" },
];

export type FareBreakdown = {
  classId: VehicleClassId;
  base: number;
  distance: number;
  nightFee: number;
  safetyFee: number;
  total: number;
  perKm: number;
  km: number;
  etaMinutes: number;
};

/** Flat rider-side safety & monitoring fee (demo figure). */
export const SAFETY_FEE = 3;
/** Night Safety Mode escort premium. */
export const NIGHT_FEE_RATE = 0.1;

export function fareFor(classId: string, km: number, night: boolean): FareBreakdown {
  const cls = vehicleClass(classId);
  const distance = Math.round(km * cls.perKm);
  const raw = Math.max(cls.minFare, cls.base + distance);
  const base = raw - distance;
  const nightFee = night ? Math.round(raw * NIGHT_FEE_RATE) : 0;
  return {
    classId: cls.id,
    base,
    distance,
    nightFee,
    safetyFee: SAFETY_FEE,
    total: raw + nightFee + SAFETY_FEE,
    perKm: cls.perKm,
    km,
    etaMinutes: Math.max(4, Math.round((km / cls.speedKmh) * 60)),
  };
}

export const CANCEL_REASONS_PASSENGER = [
  "Captain is taking too long",
  "Booked by mistake",
  "Found another ride",
  "Captain asked me to cancel",
  "I don't feel safe with this match",
];

export const CANCEL_REASONS_PARTNER = [
  "Passenger not at pickup",
  "Passenger asked me to cancel",
  "Pickup is too far",
  "Vehicle issue",
  "Wrong drop location",
];

export const RATING_TAGS = ["Safe driving", "Polite", "Clean vehicle", "On time", "Knew the route"];

export const TIP_OPTIONS = [0, 10, 20, 30];
