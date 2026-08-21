import { supabase } from "@/integrations/supabase/client";

import { fareFor, type PaymentMethod, type PaymentStatus } from "./fares";
import type { LatLng } from "./types";

/**
 * Live dispatch channel backed by Lovable Cloud.
 *
 * Passenger bookings are inserted into `ride_matches`; online, verified drivers receive
 * them through Postgres realtime (with a slow poll as a safety net). Every device that is
 * signed in — phone, laptop, another browser — sees the same live board.
 */

export type MatchStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ARRIVED"
  | "STARTED"
  | "COMPLETED"
  | "CANCELLED_BY_RIDER"
  | "CANCELLED_BY_PARTNER";

export type MatchPartner = {
  name: string;
  phone: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleNumber: string;
  rating: number;
};

export type MatchRecord = {
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  pickup: { label: string } & LatLng;
  drop: { label: string } & LatLng;
  distanceKm: number;
  fare: number;
  etaMinutes: number;
  trustedJourney: boolean;
  pin: string;
  createdAt: number;
  updatedAt: number;
  status: MatchStatus;
  partner: MatchPartner | null;
  vehicleClass: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fareFinal: number;
  tip: number;
  otpVerified: boolean;
  cancelReason: string;
  cancelledBy: string;
  passengerRating: number | null;
  driverRating: number | null;
};

/** Legacy helper kept for callers that only need a headline price. */
export function estimateFare(distanceKm: number, classId = "auto", night = false): number {
  return fareFor(classId, distanceKm, night).total;
}

type Row = {
  ride_id: string;
  passenger_name: string;
  passenger_phone: string;
  pickup: unknown;
  dropoff: unknown;
  distance_km: number | string;
  fare: number | string;
  eta_minutes: number;
  trusted_journey: boolean;
  pin: string;
  status: string;
  partner: unknown;
  created_at: string;
  updated_at: string;
  vehicle_class?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  fare_final?: number | string | null;
  tip?: number | string | null;
  otp_verified_at?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: string | null;
  passenger_rating?: number | null;
  driver_rating?: number | null;
};

function toRecord(row: Row): MatchRecord {
  return {
    rideId: row.ride_id,
    passengerName: row.passenger_name,
    passengerPhone: row.passenger_phone,
    pickup: row.pickup as MatchRecord["pickup"],
    drop: row.dropoff as MatchRecord["drop"],
    distanceKm: Number(row.distance_km),
    fare: Number(row.fare),
    etaMinutes: row.eta_minutes,
    trustedJourney: row.trusted_journey,
    pin: row.pin ?? "",
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    status: row.status as MatchStatus,
    partner: (row.partner as MatchPartner | null) ?? null,
    vehicleClass: row.vehicle_class ?? "auto",
    paymentMethod: (row.payment_method as PaymentMethod) ?? "CASH",
    paymentStatus: (row.payment_status as PaymentStatus) ?? "PENDING",
    fareFinal: Number(row.fare_final ?? 0),
    tip: Number(row.tip ?? 0),
    otpVerified: Boolean(row.otp_verified_at),
    cancelReason: row.cancel_reason ?? "",
    cancelledBy: row.cancelled_by ?? "",
    passengerRating: row.passenger_rating ?? null,
    driverRating: row.driver_rating ?? null,
  };
}

let cache: MatchRecord[] = [];
const listeners = new Set<(list: MatchRecord[]) => void>();
let started = false;

function emit() {
  for (const fn of listeners) fn(cache);
}

function upsertCache(record: MatchRecord) {
  cache = [...cache.filter((m) => m.rideId !== record.rideId), record].slice(-40);
  emit();
}

async function refresh() {
  const { data, error } = await supabase
    .from("ride_matches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data) return;
  cache = (data as unknown as Row[]).map(toRecord).reverse();
  emit();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void refresh();
  supabase
    .channel("ride-matches")
    .on("postgres_changes", { event: "*", schema: "public", table: "ride_matches" }, (payload) => {
      const row = (payload.new ?? payload.old) as Row | null;
      if (!row?.ride_id) return void refresh();
      if (payload.eventType === "DELETE") {
        cache = cache.filter((m) => m.rideId !== row.ride_id);
        emit();
        return;
      }
      upsertCache(toRecord(row));
    })
    .subscribe();
  // Safety net for throttled sockets / background tabs.
  window.setInterval(() => void refresh(), 5000);
}

export function readMatches(): MatchRecord[] {
  return cache;
}

export async function publishMatch(record: MatchRecord): Promise<void> {
  upsertCache(record);
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  await supabase.from("ride_matches").insert({
    ride_id: record.rideId,
    passenger_id: uid,
    passenger_name: record.passengerName,
    passenger_phone: record.passengerPhone,
    pickup: record.pickup,
    dropoff: record.drop,
    distance_km: record.distanceKm,
    fare: record.fare,
    eta_minutes: record.etaMinutes,
    trusted_journey: record.trustedJourney,
    pin: record.pin,
    status: record.status,
    vehicle_class: record.vehicleClass,
    payment_method: record.paymentMethod,
    payment_status: record.paymentStatus,
  });
}

/** Maps patch keys to their dispatch-table columns. */
function toColumns(patch: Partial<MatchRecord>): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if (patch.status) {
    update["status"] = patch.status;
    if (patch.status === "ARRIVED") update["arrived_at"] = new Date().toISOString();
    if (patch.status === "STARTED") update["started_at"] = new Date().toISOString();
    if (patch.status === "COMPLETED") update["completed_at"] = new Date().toISOString();
  }
  if (patch.paymentStatus) update["payment_status"] = patch.paymentStatus;
  if (patch.paymentMethod) update["payment_method"] = patch.paymentMethod;
  if (patch.fareFinal !== undefined) update["fare_final"] = patch.fareFinal;
  if (patch.tip !== undefined) update["tip"] = patch.tip;
  if (patch.otpVerified) update["otp_verified_at"] = new Date().toISOString();
  if (patch.cancelReason !== undefined) update["cancel_reason"] = patch.cancelReason;
  if (patch.cancelledBy !== undefined) update["cancelled_by"] = patch.cancelledBy;
  if (patch.passengerRating !== undefined) update["passenger_rating"] = patch.passengerRating;
  if (patch.driverRating !== undefined) update["driver_rating"] = patch.driverRating;
  return update;
}

export function patchMatch(rideId: string, patch: Partial<MatchRecord>): MatchRecord | null {
  const found = cache.find((m) => m.rideId === rideId) ?? null;
  if (found) upsertCache({ ...found, ...patch, updatedAt: Date.now() });

  void (async () => {
    const update = toColumns(patch);
    if (patch.partner !== undefined) {
      update["partner"] = patch.partner;
      const { data: auth } = await supabase.auth.getUser();
      if (patch.partner && auth.user?.id) update["partner_id"] = auth.user.id;
    }
    if (Object.keys(update).length === 0) return;
    await supabase.from("ride_matches").update(update as never).eq("ride_id", rideId);
    void refresh();
  })();

  return found ? { ...found, ...patch, updatedAt: Date.now() } : null;
}

export function subscribeMatches(fn: (list: MatchRecord[]) => void): () => void {
  listeners.add(fn);
  start();
  if (cache.length) fn(cache);
  return () => {
    listeners.delete(fn);
  };
}

/** Called after sign-in / sign-out so the board reflects the new session's access rules. */
export function resetMatchCache() {
  cache = [];
  emit();
  void refresh();
}
