import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "./auth";
import { makeId } from "./data";
import { commissionRate, summarise, type EarningsSummary } from "./earnings";
import { patchMatch, readMatches, subscribeMatches, type MatchRecord } from "./match-bus";

export type PartnerDocKey = "aadhaar" | "license" | "rc" | "police" | "selfie";

export type PartnerVerification = "DRAFT" | "IN_REVIEW" | "APPROVED";

export type PartnerProfile = {
  id: string;
  name: string;
  phone: string;
  city: string;
  gender: "female" | "male" | "other";
  vehicleType: string;
  vehicleModel: string;
  vehicleNumber: string;
  licenceNumber: string;
  womenOnlyPreference: boolean;
  docs: Record<PartnerDocKey, boolean>;
  verification: PartnerVerification;
  rating: number;
  joinedAt: number;
};

export type PartnerRideRequest = {
  id: string;
  /** Set when this offer came from a real passenger booking on this device. */
  rideId?: string;
  live?: boolean;
  pickup: { label: string; lat: number; lng: number };
  drop: { label: string; lat: number; lng: number };
  passengerName: string;
  passengerPhone?: string;
  pin?: string;
  distanceKm: number;
  fare: number;
  etaMinutes: number;
  trustedJourney: boolean;
  createdAt: number;
  status: "OFFERED" | "ACCEPTED" | "ARRIVED" | "ONGOING" | "COMPLETED" | "DECLINED";
  vehicleClass: string;
  paymentMethod: "CASH" | "UPI";
  paymentStatus: "PENDING" | "PAID";
  otpVerified?: boolean;
  tip?: number;
  passengerRating?: number;
};

export type PayoutStatus = "PROCESSING" | "PAID";

export type Payout = {
  id: string;
  amount: number;
  tripIds: string[];
  requestedAt: number;
  settledAt: number | null;
  status: PayoutStatus;
  reference: string;
  method: string;
};

type PartnerState = {
  hydrated: boolean;
  profile: PartnerProfile | null;
  online: boolean;
  requests: PartnerRideRequest[];
  activeId: string | null;
  completed: PartnerRideRequest[];
  payouts: Payout[];
};

const KEY = "nariride.partner.v1";

const initial: PartnerState = {
  hydrated: false,
  profile: null,
  online: false,
  requests: [],
  activeId: null,
  completed: [],
  payouts: [],
};

function fromMatch(m: MatchRecord): PartnerRideRequest {
  return {
    id: m.rideId,
    rideId: m.rideId,
    live: true,
    pickup: m.pickup,
    drop: m.drop,
    passengerName: m.passengerName,
    passengerPhone: m.passengerPhone,
    pin: m.pin,
    distanceKm: Number(m.distanceKm.toFixed(1)),
    fare: m.fare,
    etaMinutes: m.etaMinutes,
    trustedJourney: m.trustedJourney,
    createdAt: m.createdAt,
    status: "OFFERED",
    vehicleClass: m.vehicleClass,
    paymentMethod: m.paymentMethod,
    paymentStatus: m.paymentStatus,
    otpVerified: m.otpVerified,
    tip: m.tip,
  };
}


type Ctx = {
  state: PartnerState;
  activeRequest: PartnerRideRequest | null;
  todayEarnings: number;
  earnings: EarningsSummary;
  unpaidTrips: PartnerRideRequest[];
  payoutAvailable: number;
  saveProfile: (p: Omit<PartnerProfile, "id" | "joinedAt" | "rating" | "verification" | "docs"> & {
    docs: Record<PartnerDocKey, boolean>;
  }) => void;
  submitForReview: () => void;
  approve: () => void;
  setOnline: (on: boolean) => void;
  accept: (id: string) => void;
  decline: (id: string) => void;
  advance: (id: string) => void;
  verifyOtp: (id: string, code: string) => boolean;
  collectPayment: (id: string) => void;
  ratePassenger: (id: string, stars: number) => void;
  cancelTrip: (id: string, reason: string) => void;
  requestPayout: () => void;
  resetPartner: () => void;
};

const PartnerContext = createContext<Ctx | null>(null);

type DriverRow = {
  user_id: string;
  name: string;
  phone: string;
  city: string;
  gender: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_number: string;
  licence_number: string;
  women_only: boolean;
  docs: Record<string, boolean> | null;
  verification: string;
  rating: number | string;
  online: boolean;
  created_at: string;
};

function toPartnerProfile(row: DriverRow): PartnerProfile {
  return {
    id: row.user_id,
    name: row.name,
    phone: row.phone,
    city: row.city,
    gender: (row.gender as PartnerProfile["gender"]) ?? "female",
    vehicleType: row.vehicle_type,
    vehicleModel: row.vehicle_model,
    vehicleNumber: row.vehicle_number,
    licenceNumber: row.licence_number,
    womenOnlyPreference: row.women_only,
    docs: (row.docs ?? {}) as PartnerProfile["docs"],
    verification: (row.verification as PartnerVerification) ?? "DRAFT",
    rating: Number(row.rating),
    joinedAt: new Date(row.created_at).getTime(),
  };
}

export function PartnerProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<PartnerState>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PartnerState>;
        setState((s) => ({
          ...s,
          ...parsed,
          // Live passenger offers are re-published by the dispatch bus, never restored stale.
          requests: (parsed.requests ?? []).filter((r) => !r.live),
          activeId: parsed.activeId ?? null,
          payouts: parsed.payouts ?? [],
          hydrated: true,
        }));
        return;
      }
    } catch {
      // Corrupt storage — start clean instead of blocking the partner app.
    }
    setState((s) => ({ ...s, hydrated: true }));
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({
          profile: state.profile,
          online: state.online,
          requests: state.requests.slice(-12),
          activeId: state.activeId,
          completed: state.completed.slice(-40),
          payouts: state.payouts.slice(-20),
        }),
      );
    } catch {
      // Non-fatal: session continues in memory.
    }
  }, [state]);

  /** Driver account, verification state and payouts live in the cloud. */
  useEffect(() => {
    const userId = auth.profile?.id;
    if (!userId) {
      setState((s) => ({ ...s, profile: null, online: false }));
      return;
    }
    void (async () => {
      const [{ data: driver }, { data: payoutRows }] = await Promise.all([
        supabase.from("driver_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("payouts").select("*").eq("user_id", userId).order("requested_at", { ascending: false }),
      ]);
      setState((s) => ({
        ...s,
        hydrated: true,
        profile: driver ? toPartnerProfile(driver as unknown as DriverRow) : null,
        online: driver ? Boolean((driver as unknown as DriverRow).online) : false,
        payouts: (payoutRows ?? []).map((r) => {
          const row = r as unknown as {
            id: string;
            amount: number | string;
            trip_ids: string[] | null;
            method: string;
            reference: string;
            status: string;
            requested_at: string;
            settled_at: string | null;
          };
          return {
            id: row.id,
            amount: Number(row.amount),
            tripIds: row.trip_ids ?? [],
            method: row.method,
            reference: row.reference,
            status: row.status === "PAID" ? "PAID" : "PROCESSING",
            requestedAt: new Date(row.requested_at).getTime(),
            settledAt: row.settled_at ? new Date(row.settled_at).getTime() : null,
          } satisfies Payout;
        }),
      }));
    })();
  }, [auth.profile?.id]);

  // Ride offers now come from real passenger bookings only (see the realtime sync below).


  /** Real-time matching: passenger bookings arrive through the shared dispatch bus. */
  const syncMatches = useCallback((list: MatchRecord[]) => {
    setState((s) => {
      let requests = s.requests;
      let activeId = s.activeId;

      // New passenger requests become live offers.
      for (const m of list) {
        if (m.status !== "REQUESTED") continue;
        if (requests.some((r) => r.id === m.rideId)) continue;
        requests = [fromMatch(m), ...requests];
      }

      // A passenger cancellation drops the offer (or the active trip).
      for (const m of list) {
        if (m.status !== "CANCELLED_BY_RIDER") continue;
        requests = requests.filter((r) => r.id !== m.rideId);
        if (activeId === m.rideId) activeId = null;
      }

      // Another partner took the ride while it was still on our board.
      for (const m of list) {
        if (m.status !== "ACCEPTED") continue;
        const mine = requests.find((r) => r.id === m.rideId);
        if (mine && mine.status === "OFFERED" && activeId !== m.rideId) {
          requests = requests.filter((r) => r.id !== m.rideId);
        }
      }

      // Passenger paid / tipped / rated after drop-off.
      let completed = s.completed;
      for (const m of list) {
        const trip = completed.find((r) => r.id === m.rideId);
        if (!trip) continue;
        const tip = m.tip ?? 0;
        const paid = m.paymentStatus === "PAID" ? "PAID" : trip.paymentStatus;
        if (trip.tip === tip && trip.paymentStatus === paid) continue;
        completed = completed.map((r) =>
          r.id === m.rideId ? { ...r, tip, paymentStatus: paid, fare: trip.fare } : r,
        );
      }

      if (requests === s.requests && activeId === s.activeId && completed === s.completed) return s;
      return { ...s, requests, activeId, completed };
    });
  }, []);

  useEffect(() => {
    syncMatches(readMatches());
    return subscribeMatches(syncMatches);
  }, [syncMatches]);

  const activeRequest = useMemo(
    () => state.requests.find((r) => r.id === state.activeId) ?? null,
    [state.requests, state.activeId],
  );

  const rate = useMemo(() => commissionRate(state.profile), [state.profile]);
  const earnings = useMemo(() => summarise(state.completed, rate), [state.completed, rate]);
  const todayEarnings = earnings.today;

  const paidTripIds = useMemo(
    () => new Set(state.payouts.flatMap((p) => p.tripIds)),
    [state.payouts],
  );
  const unpaidTrips = useMemo(
    () => state.completed.filter((t) => !paidTripIds.has(t.id)),
    [state.completed, paidTripIds],
  );
  const payoutAvailable = useMemo(
    () => summarise(unpaidTrips, rate).net,
    [unpaidTrips, rate],
  );

  const saveProfile = useCallback<Ctx["saveProfile"]>(
    (p) => {
      const userId = auth.profile?.id;
      setState((s) => ({
        ...s,
        profile: {
          id: userId ?? s.profile?.id ?? makeId("P"),
          joinedAt: s.profile?.joinedAt ?? Date.now(),
          rating: s.profile?.rating ?? 4.9,
          verification: s.profile?.verification ?? "DRAFT",
          ...p,
        },
      }));
      if (!userId) return;
      void supabase.from("driver_profiles").upsert({
        user_id: userId,
        name: p.name,
        phone: p.phone,
        city: p.city,
        gender: p.gender,
        vehicle_type: p.vehicleType,
        vehicle_model: p.vehicleModel,
        vehicle_number: p.vehicleNumber,
        licence_number: p.licenceNumber,
        women_only: p.womenOnlyPreference,
        docs: p.docs,
      });
    },
    [auth.profile?.id],
  );

  const setVerification = useCallback(
    (verification: PartnerVerification) => {
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, verification } } : s));
      const userId = auth.profile?.id;
      if (userId) void supabase.from("driver_profiles").update({ verification }).eq("user_id", userId);
    },
    [auth.profile?.id],
  );

  const submitForReview = useCallback(() => {
    setVerification("IN_REVIEW");
    // Simulated background verification (no paid KYC provider).
    window.setTimeout(() => setVerification("APPROVED"), 2600);
  }, [setVerification]);

  const approve = useCallback(() => setVerification("APPROVED"), [setVerification]);

  const setOnline = useCallback(
    (on: boolean) => {
      setState((s) => ({
        ...s,
        online: on,
        requests: on ? s.requests : s.requests.filter((r) => r.id === s.activeId),
      }));
      const userId = auth.profile?.id;
      if (userId) void supabase.from("driver_profiles").update({ online: on }).eq("user_id", userId);
    },
    [auth.profile?.id],
  );

  const accept = useCallback((id: string) => {
    const s = stateRef.current;
    const req = s.requests.find((r) => r.id === id);
    const profile = s.profile;
    if (req?.live && req.rideId && profile) {
      patchMatch(req.rideId, {
        status: "ACCEPTED",
        partner: {
          name: profile.name,
          phone: profile.phone,
          vehicleType: profile.vehicleType,
          vehicleModel: profile.vehicleModel,
          vehicleNumber: profile.vehicleNumber,
          rating: profile.rating,
        },
      });
    }
    setState((prev) => ({
      ...prev,
      activeId: id,
      requests: prev.requests
        .filter((r) => r.id === id || r.status !== "OFFERED")
        .map((r) => (r.id === id ? { ...r, status: "ACCEPTED" } : r)),
    }));
  }, []);

  const decline = useCallback((id: string) => {
    setState((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== id) }));
  }, []);

  /** Pickup PIN check — the trip cannot start until the passenger's 4-digit PIN matches. */
  const verifyOtp = useCallback((id: string, code: string) => {
    const req = stateRef.current.requests.find((r) => r.id === id);
    if (!req) return false;
    const expected = (req.pin ?? "").trim();
    if (expected && expected !== code.trim()) return false;
    if (req.live && req.rideId) patchMatch(req.rideId, { otpVerified: true });
    setState((s) => ({
      ...s,
      requests: s.requests.map((r) => (r.id === id ? { ...r, otpVerified: true } : r)),
    }));
    return true;
  }, []);

  const collectPayment = useCallback((id: string) => {
    const req = stateRef.current.requests.find((r) => r.id === id) ?? stateRef.current.completed.find((r) => r.id === id);
    if (!req) return;
    if (req.live && req.rideId) patchMatch(req.rideId, { paymentStatus: "PAID", fareFinal: req.fare });
    setState((s) => ({
      ...s,
      requests: s.requests.map((r) => (r.id === id ? { ...r, paymentStatus: "PAID" } : r)),
      completed: s.completed.map((r) => (r.id === id ? { ...r, paymentStatus: "PAID" } : r)),
    }));
  }, []);

  const ratePassenger = useCallback((id: string, stars: number) => {
    const req = stateRef.current.completed.find((r) => r.id === id) ?? stateRef.current.requests.find((r) => r.id === id);
    if (req?.live && req.rideId) patchMatch(req.rideId, { passengerRating: stars });
    setState((s) => ({
      ...s,
      completed: s.completed.map((r) => (r.id === id ? { ...r, passengerRating: stars } : r)),
    }));
  }, []);

  const cancelTrip = useCallback((id: string, reason: string) => {
    const req = stateRef.current.requests.find((r) => r.id === id);
    if (req?.live && req.rideId) {
      patchMatch(req.rideId, { status: "CANCELLED_BY_PARTNER", cancelReason: reason, cancelledBy: "PARTNER" });
    }
    setState((s) => ({
      ...s,
      activeId: s.activeId === id ? null : s.activeId,
      requests: s.requests.filter((r) => r.id !== id),
    }));
  }, []);

  const advance = useCallback((id: string) => {
    const current = stateRef.current.requests.find((r) => r.id === id);
    const nextStatus: PartnerRideRequest["status"] =
      current?.status === "ACCEPTED" ? "ARRIVED" : current?.status === "ARRIVED" ? "ONGOING" : "COMPLETED";
    // Rapido-style pickup gate: the PIN must be verified before the trip starts.
    if (nextStatus === "ONGOING" && current?.pin && !current.otpVerified) return;
    if (current?.live && current.rideId) {
      patchMatch(current.rideId, {
        status: nextStatus === "ARRIVED" ? "ARRIVED" : nextStatus === "ONGOING" ? "STARTED" : "COMPLETED",
        ...(nextStatus === "COMPLETED" ? { fareFinal: current.fare } : {}),
      });
    }
    setState((s) => {
      const req = s.requests.find((r) => r.id === id);
      if (!req) return s;
      if (nextStatus === "COMPLETED") {
        return {
          ...s,
          activeId: null,
          requests: s.requests.filter((r) => r.id !== id),
          completed: [{ ...req, status: "COMPLETED" }, ...s.completed],
        };
      }
      return { ...s, requests: s.requests.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)) };
    });
  }, []);


  const requestPayout = useCallback(() => {
    const s = stateRef.current;
    const paid = new Set(s.payouts.flatMap((p) => p.tripIds));
    const pending = s.completed.filter((t) => !paid.has(t.id));
    if (pending.length === 0) return;
    const amount = summarise(pending, commissionRate(s.profile)).net;
    if (amount <= 0) return;
    const payout: Payout = {
      id: makeId("PO"),
      amount,
      tripIds: pending.map((t) => t.id),
      requestedAt: Date.now(),
      settledAt: null,
      status: "PROCESSING",
      reference: `NRPAY${Math.floor(100000 + Math.random() * 899999)}`,
      method: "Instant UPI (simulated)",
    };
    setState((prev) => ({ ...prev, payouts: [payout, ...prev.payouts] }));
    const userId = auth.profile?.id;
    void (async () => {
      let rowId = payout.id;
      if (userId) {
        const { data } = await supabase
          .from("payouts")
          .insert({
            user_id: userId,
            amount: payout.amount,
            trip_ids: payout.tripIds,
            method: payout.method,
            reference: payout.reference,
            status: "PROCESSING",
          })
          .select("id")
          .maybeSingle();
        const realId = (data as { id: string } | null)?.id;
        if (realId) {
          rowId = realId;
          setState((prev) => ({
            ...prev,
            payouts: prev.payouts.map((p) => (p.id === payout.id ? { ...p, id: realId } : p)),
          }));
        }
      }
      // Simulated settlement — no payment provider is contacted.
      window.setTimeout(() => {
        setState((prev) => ({
          ...prev,
          payouts: prev.payouts.map((p) =>
            p.id === rowId ? { ...p, status: "PAID", settledAt: Date.now() } : p,
          ),
        }));
        if (userId) {
          void supabase
            .from("payouts")
            .update({ status: "PAID", settled_at: new Date().toISOString() })
            .eq("id", rowId);
        }
      }, 4000);
    })();
  }, [auth.profile?.id]);

  const resetPartner = useCallback(() => setState({ ...initial, hydrated: true }), []);

  const value: Ctx = {
    state,
    activeRequest,
    todayEarnings,
    earnings,
    unpaidTrips,
    payoutAvailable,
    saveProfile,
    submitForReview,
    approve,
    setOnline,
    accept,
    decline,
    advance,
    verifyOtp,
    collectPayment,
    ratePassenger,
    cancelTrip,
    requestPayout,
    resetPartner,
  };

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner(): Ctx {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error("usePartner must be used inside PartnerProvider");
  return ctx;
}
