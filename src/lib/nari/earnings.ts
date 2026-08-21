import type { PartnerProfile, PartnerRideRequest } from "./partner-store";

/** Platform commission. Women partners get a reduced rate as part of the programme. */
export const BASE_COMMISSION_RATE = 0.15;
export const WOMEN_PARTNER_COMMISSION_RATE = 0.12;
/** Flat per-trip insurance + safety-monitoring levy (demo figures). */
export const SAFETY_LEVY = 2;

export function commissionRate(profile: PartnerProfile | null): number {
  return profile?.gender === "female" ? WOMEN_PARTNER_COMMISSION_RATE : BASE_COMMISSION_RATE;
}

export type TripEarning = {
  id: string;
  at: number;
  passengerName: string;
  dropLabel: string;
  distanceKm: number;
  gross: number;
  commission: number;
  levy: number;
  net: number;
  trustedJourney: boolean;
};

export function tripEarning(trip: PartnerRideRequest, rate: number): TripEarning {
  const gross = trip.fare;
  const commission = Math.round(gross * rate);
  const levy = SAFETY_LEVY;
  return {
    id: trip.id,
    at: trip.createdAt,
    passengerName: trip.passengerName,
    dropLabel: trip.drop.label,
    distanceKm: trip.distanceKm,
    gross,
    commission,
    levy,
    net: Math.max(0, gross - commission - levy),
    trustedJourney: trip.trustedJourney,
  };
}

export type EarningsSummary = {
  rate: number;
  trips: TripEarning[];
  gross: number;
  commission: number;
  levy: number;
  net: number;
  today: number;
  week: number;
  perKm: number;
};

export function summarise(trips: PartnerRideRequest[], rate: number): EarningsSummary {
  const rows = trips.map((t) => tripEarning(t, rate));
  const sum = (pick: (r: TripEarning) => number) => rows.reduce((a, r) => a + pick(r), 0);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayMs = startOfDay.getTime();
  const weekMs = dayMs - 6 * 86400000;
  const km = sum((r) => r.distanceKm);
  return {
    rate,
    trips: rows,
    gross: sum((r) => r.gross),
    commission: sum((r) => r.commission),
    levy: sum((r) => r.levy),
    net: sum((r) => r.net),
    today: rows.filter((r) => r.at >= dayMs).reduce((a, r) => a + r.net, 0),
    week: rows.filter((r) => r.at >= weekMs).reduce((a, r) => a + r.net, 0),
    perKm: km > 0 ? Math.round((sum((r) => r.net) / km) * 10) / 10 : 0,
  };
}

export function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
