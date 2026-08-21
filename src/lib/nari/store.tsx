import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "./auth";
import { buildRoute, haversine, routeLength } from "./geo";
import {
  DEFAULT_SETTINGS,
  DEMO_DESTINATION,
  DEMO_POLICE_STATIONS,
  DEMO_PICKUP,
  assignDriver,
  isNightNow,
  makeId,
  makePin,
} from "./data";
import { assessRisk, isHigher } from "./risk";
import { fareFor, type PaymentMethod } from "./fares";
import { patchMatch, publishMatch, readMatches, subscribeMatches, type MatchRecord } from "./match-bus";
import { initialSimState, stepSimulation, type SimMode, type SimState } from "./simulator";

import type {
  EmergencyContact,
  IncidentStatus,
  LatLng,
  LocationPoint,
  NotificationRecord,
  PoliceStation,
  Ride,
  RiskAssessment,
  SafetyCheck,
  SafetyIncident,
  SafetySettings,
  TimelineEntry,
  User,
} from "./types";

const STORAGE_KEY = "nariride.state.v1";

type Persisted = {
  onboarded: boolean;
  user: User | null;
  contacts: EmergencyContact[];
  settings: SafetySettings;
  rides: Ride[];
  activeRideId: string | null;
  incidents: SafetyIncident[];
  notifications: NotificationRecord[];
  demoMode: boolean;
};

type State = Persisted & {
  hydrated: boolean;
  safetyCheck: SafetyCheck | null;
  sim: SimState;
  useDeviceGps: boolean;
  gpsMessage: string | null;
  confirmedSafeAt: number | null;
};

const initialState: State = {
  hydrated: false,
  onboarded: false,
  user: null,
  contacts: [],
  settings: DEFAULT_SETTINGS,
  rides: [],
  activeRideId: null,
  incidents: [],
  notifications: [],
  demoMode: false,
  safetyCheck: null,
  sim: initialSimState,
  useDeviceGps: false,
  gpsMessage: null,
  confirmedSafeAt: null,
};

function entry(kind: TimelineEntry["kind"], label: string, detail?: string, level?: TimelineEntry["level"]): TimelineEntry {
  return {
    id: makeId("T"),
    at: Date.now(),
    label,
    kind,
    ...(detail === undefined ? {} : { detail }),
    ...(level === undefined ? {} : { level }),
  };
}

export type BookRideInput = {
  pickup: { label: string } & LatLng;
  destination: { label: string } & LatLng;
  rideType: string;
  vehicleClass: string;
  paymentMethod: PaymentMethod;
  trustedJourney: boolean;
  usePin: boolean;
};


type Ctx = {
  state: State;
  activeRide: Ride | null;
  activeIncident: SafetyIncident | null;
  nightActive: boolean;
  register: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  finishOnboarding: () => void;
  updateUser: (patch: Partial<User>) => void;
  addContact: (c: Omit<EmergencyContact, "id">) => void;
  updateContact: (id: string, patch: Partial<EmergencyContact>) => void;
  deleteContact: (id: string) => void;
  updateSettings: (patch: Partial<SafetySettings>) => void;
  bookRide: (input: BookRideInput) => Ride;
  startRide: () => void;
  cancelRide: (reason?: string) => void;
  completeRide: () => void;
  settleRide: (input: { rideId: string; tip: number; rating: number; tags: string[] }) => void;
  pushLocation: (point: LocationPoint) => void;
  setSimMode: (mode: SimMode) => void;
  setUseDeviceGps: (on: boolean) => void;
  setGpsMessage: (m: string | null) => void;
  respondSafetyCheck: (safe: boolean) => void;
  openSafetyCheck: (reason: SafetyCheck["reason"]) => void;
  triggerSos: () => SafetyIncident | null;
  setIncidentStatus: (id: string, status: IncidentStatus) => void;
  clearRideHistory: () => void;
  startDemo: () => void;
  resetDemo: () => void;
  setDemoMode: (on: boolean) => void;
  nearestStations: (from: LatLng | null) => (PoliceStation & { distance: number })[];
};

const NariContext = createContext<Ctx | null>(null);

export function NariProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<State>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate from localStorage (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        setState((s) => ({
          ...s,
          ...parsed,
          user: s.user,
          contacts: s.contacts,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
          hydrated: true,
        }));
        return;
      }
    } catch {
      // Corrupt storage: fall back to defaults rather than blocking the app.
    }
    setState((s) => ({ ...s, hydrated: true }));
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const persisted: Persisted = {
      onboarded: state.onboarded,
      user: null,
      contacts: [],
      settings: state.settings,
      rides: state.rides.slice(-25),
      activeRideId: state.activeRideId,
      incidents: state.incidents.slice(-25),
      notifications: state.notifications.slice(-60),
      demoMode: state.demoMode,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Storage full or unavailable — the session still works in memory.
    }
  }, [state]);

  // The signed-in account is the source of truth for identity and trusted contacts.
  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.profile) {
      setState((s) => (s.user === null ? s : { ...s, user: null, contacts: [] }));
      return;
    }
    const p = auth.profile;
    setState((s) => ({
      ...s,
      user: {
        id: p.id,
        name: p.name,
        email: auth.authUser?.email ?? "",
        phone: p.phone,
        avatarSeed: (p.name.trim().slice(0, 2) || "NR").toUpperCase(),
        homeLabel: p.homeLabel,
        workLabel: p.workLabel,
        passwordHash: "",
      },
    }));
  }, [auth.ready, auth.profile, auth.authUser?.email]);

  useEffect(() => {
    const userId = auth.profile?.id;
    if (!userId) return;
    void (async () => {
      const { data } = await supabase
        .from("trusted_contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (!data) return;
      const contacts: EmergencyContact[] = (data as unknown as {
        id: string;
        name: string;
        phone: string;
        relationship: string;
      }[]).map((r) => ({ id: r.id, name: r.name, phone: r.phone, relationship: r.relationship }));
      setState((s) => ({ ...s, contacts }));
    })();
  }, [auth.profile?.id]);

  const activeRide = useMemo(
    () => state.rides.find((r) => r.id === state.activeRideId) ?? null,
    [state.rides, state.activeRideId],
  );

  const activeIncident = useMemo(
    () =>
      state.incidents.find((i) => i.rideId === state.activeRideId && (i.status === "ACTIVE" || i.status === "RESPONDING")) ??
      null,
    [state.incidents, state.activeRideId],
  );

  const nightActive = useMemo(() => isNightNow(state.settings), [state.settings]);

  const patchRide = useCallback((id: string, fn: (r: Ride) => Ride) => {
    setState((s) => ({ ...s, rides: s.rides.map((r) => (r.id === id ? fn(r) : r)) }));
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; phone: string; password: string }) => {
      const error = await auth.signUp({ ...input, mode: "passenger" });
      if (error) throw new Error(error);
    },
    [auth],
  );

  const login = useCallback(
    async (email: string, password: string) => (await auth.signIn(email, password)) === null,
    [auth],
  );

  const logout = useCallback(() => {
    setState((s) => ({ ...s, activeRideId: null, sim: initialSimState, contacts: [], rides: [], incidents: [] }));
    void auth.signOut();
  }, [auth]);

  const finishOnboarding = useCallback(() => setState((s) => ({ ...s, onboarded: true })), []);

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      setState((s) => ({ ...s, user: s.user ? { ...s.user, ...patch } : s.user }));
      void auth.updateProfile({
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.phone === undefined ? {} : { phone: patch.phone }),
        ...(patch.homeLabel === undefined ? {} : { homeLabel: patch.homeLabel }),
        ...(patch.workLabel === undefined ? {} : { workLabel: patch.workLabel }),
      });
    },
    [auth],
  );

  const addContact = useCallback(
    (c: Omit<EmergencyContact, "id">) => {
      const userId = auth.profile?.id;
      const temp = { ...c, id: makeId("C") };
      setState((s) => ({ ...s, contacts: [...s.contacts, temp] }));
      if (!userId) return;
      void (async () => {
        const { data } = await supabase
          .from("trusted_contacts")
          .insert({ user_id: userId, name: c.name, phone: c.phone, relationship: c.relationship })
          .select("id")
          .maybeSingle();
        const realId = (data as { id: string } | null)?.id;
        if (realId) {
          setState((s) => ({
            ...s,
            contacts: s.contacts.map((x) => (x.id === temp.id ? { ...x, id: realId } : x)),
          }));
        }
      })();
    },
    [auth.profile?.id],
  );

  const updateContact = useCallback((id: string, patch: Partial<EmergencyContact>) => {
    setState((s) => ({ ...s, contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row["name"] = patch.name;
    if (patch.phone !== undefined) row["phone"] = patch.phone;
    if (patch.relationship !== undefined) row["relationship"] = patch.relationship;
    if (Object.keys(row).length === 0) return;
    void supabase.from("trusted_contacts").update(row as never).eq("id", id);
  }, []);

  const deleteContact = useCallback((id: string) => {
    setState((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) }));
    void supabase.from("trusted_contacts").delete().eq("id", id);
  }, []);

  const updateSettings = useCallback((patch: Partial<SafetySettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const notifyContacts = useCallback(
    (ride: Ride, location: LatLng | null, kind: NotificationRecord["kind"], message: string) => {
      const s = stateRef.current;
      const records: NotificationRecord[] = s.contacts.map((c) => ({
        id: makeId("N"),
        recipient: `${c.name} (${c.relationship})`,
        phone: c.phone,
        message,
        timestamp: Date.now(),
        location,
        rideId: ride.id,
        status: "SIMULATED_DELIVERED",
        kind,
      }));
      setState((prev) => ({ ...prev, notifications: [...prev.notifications, ...records] }));
      return records;
    },
    [],
  );

  const bookRide = useCallback(
    (input: BookRideInput) => {
      const id = makeId("RIDE");
      const route = buildRoute(input.pickup, input.destination, [...id].reduce((a, c) => a + c.charCodeAt(0), 0));
      const distanceKm = routeLength(route) / 1000;
      const nightMode = isNightNow(stateRef.current.settings);
      const quote = fareFor(input.vehicleClass, distanceKm, nightMode);
      const ride: Ride = {
        id,
        pickup: input.pickup,
        destination: input.destination,
        route,
        rideType: input.rideType,
        vehicleClass: input.vehicleClass,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
        fare: quote.total,
        tip: 0,
        otpVerified: false,
        pin: input.usePin ? makePin() : makePin(),
        trustedJourney: input.trustedJourney,
        nightMode,
        driver: assignDriver(id),
        status: "REQUESTED",
        createdAt: Date.now(),
        distanceKm,
        etaMinutes: quote.etaMinutes,
        path: [],
        risk: null,
        peakLevel: "SAFE",
        deviationOccurred: false,
        sosActivated: false,
        timeline: [
          entry("ride", "Ride requested", `${input.pickup.label} → ${input.destination.label}`),
          entry("ride", "Matching a nearby partner", "Broadcast to online NariRide partners"),
        ],
        demo: stateRef.current.demoMode,
      };
      setState((s) => ({
        ...s,
        rides: [...s.rides, ride],
        activeRideId: ride.id,
        sim: initialSimState,
        safetyCheck: null,
        confirmedSafeAt: null,
      }));
      // Broadcast to the partner app for real-time matching.
      publishMatch({
        rideId: ride.id,
        passengerName: stateRef.current.user?.name ?? "Passenger",
        passengerPhone: stateRef.current.user?.phone ?? "—",
        pickup: input.pickup,
        drop: input.destination,
        distanceKm,
        fare: quote.total,
        etaMinutes: ride.etaMinutes,
        trustedJourney: input.trustedJourney,
        pin: ride.pin,
        createdAt: ride.createdAt,
        updatedAt: ride.createdAt,
        status: "REQUESTED",
        partner: null,
        vehicleClass: input.vehicleClass,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
        fareFinal: 0,
        tip: 0,
        otpVerified: false,
        cancelReason: "",
        cancelledBy: "",
        passengerRating: null,
        driverRating: null,
      });
      if (input.trustedJourney) {
        notifyContacts(
          ride,
          input.pickup,
          "journey",
          `NariRide Trusted Journey: ${stateRef.current.user?.name ?? "Passenger"} started a ride from ${input.pickup.label} to ${input.destination.label}. Ride ID ${ride.id}. Driver ${ride.driver.name}, vehicle ${ride.driver.vehicleNumber}.`,
        );
      }
      return ride;
    },
    [notifyContacts],

  );


  const startRide = useCallback(() => {
    const s = stateRef.current;
    if (!s.activeRideId) return;
    patchRide(s.activeRideId, (r) => ({
      ...r,
      status: "ACTIVE",
      startedAt: Date.now(),
      timeline: [
        ...r.timeline,
        entry("ride", "Ride started", "GPS tracking session authorised"),
        entry("safety", "Safety monitoring active", r.nightMode ? "Night Safety Mode enhanced monitoring" : "Standard monitoring"),
      ],
    }));
    setState((prev) => ({ ...prev, sim: { ...initialSimState, mode: "normal" } }));
  }, [patchRide]);

  const openSafetyCheck = useCallback((reason: SafetyCheck["reason"]) => {
    setState((s) => {
      if (s.safetyCheck) return s;
      const ride = s.rides.find((r) => r.id === s.activeRideId);
      const level = ride?.risk?.level ?? "MONITORING";
      return {
        ...s,
        safetyCheck: {
          id: makeId("SC"),
          reason,
          level,
          openedAt: Date.now(),
          message:
            reason === "arrival"
              ? "You've reached your destination."
              : "Your ride is taking an unexpected route.",
        },
      };
    });
  }, []);

  const pushLocation = useCallback(
    (point: LocationPoint) => {
      setState((s) => {
        const ride = s.rides.find((r) => r.id === s.activeRideId);
        if (!ride || ride.status !== "ACTIVE") return s;
        const path = [...ride.path, point].slice(-160);
        const risk = assessRisk({
          path,
          route: ride.route,
          destination: ride.destination,
          settings: s.settings,
          nightMode: ride.nightMode,
          sosActivated: ride.sosActivated,
          passengerConfirmedSafeAt: s.confirmedSafeAt,
        });
        const timeline = [...ride.timeline];
        if (!ride.risk || ride.risk.level !== risk.level) {
          timeline.push(entry("safety", `Safety status: ${risk.level.replace("_", " ")}`, risk.explanation, risk.level));
        }
        const peakLevel = isHigher(risk.level, ride.peakLevel) ? risk.level : ride.peakLevel;
        const arrived = risk.distanceToDestination < 90;
        const updated: Ride = {
          ...ride,
          path,
          risk,
          peakLevel,
          deviationOccurred: ride.deviationOccurred || risk.deviationMeters > s.settings.deviationThresholds.monitoring,
          status: arrived && !ride.sosActivated ? "ARRIVED" : ride.status,
          timeline: arrived && ride.status === "ACTIVE" ? [...timeline, entry("ride", "Destination reached")] : timeline,
        };

        let safetyCheck = s.safetyCheck;
        if (!safetyCheck && arrived && ride.status === "ACTIVE") {
          safetyCheck = {
            id: makeId("SC"),
            reason: "arrival",
            level: risk.level,
            openedAt: Date.now(),
            message: "You've reached your destination.",
          };
        } else if (
          !safetyCheck &&
          !ride.sosActivated &&
          (risk.level === "HIGH_RISK" || risk.level === "CRITICAL") &&
          (!s.confirmedSafeAt || Date.now() - s.confirmedSafeAt > 120000)
        ) {
          safetyCheck = {
            id: makeId("SC"),
            reason: "deviation",
            level: risk.level,
            openedAt: Date.now(),
            message: "Your ride is taking an unexpected route.",
          };
        }

        return {
          ...s,
          safetyCheck,
          rides: s.rides.map((r) => (r.id === ride.id ? updated : r)),
        };
      });
    },
    [],
  );

  const setSimMode = useCallback((mode: SimMode) => {
    setState((s) => ({ ...s, sim: { ...s.sim, mode } }));
  }, []);

  const setUseDeviceGps = useCallback((on: boolean) => {
    setState((s) => ({ ...s, useDeviceGps: on, sim: { ...s.sim, mode: on ? "paused" : s.sim.mode } }));
  }, []);

  const setGpsMessage = useCallback((m: string | null) => setState((s) => ({ ...s, gpsMessage: m })), []);

  const respondSafetyCheck = useCallback(
    (safe: boolean) => {
      const s = stateRef.current;
      const check = s.safetyCheck;
      if (!check || !s.activeRideId) return;
      if (safe) {
        patchRide(s.activeRideId, (r) => ({
          ...r,
          timeline: [...r.timeline, entry("safety", "Passenger confirmed safe", check.message)],
        }));
        setState((prev) => ({ ...prev, safetyCheck: null, confirmedSafeAt: Date.now() }));
      } else {
        setState((prev) => ({ ...prev, safetyCheck: null }));
      }
    },
    [patchRide],
  );

  const nearestStations = useCallback((from: LatLng | null) => {
    const origin = from ?? DEMO_PICKUP;
    return DEMO_POLICE_STATIONS.map((st) => ({ ...st, distance: haversine(origin, st) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, []);

  const triggerSos = useCallback(() => {
    const s = stateRef.current;
    const ride = s.rides.find((r) => r.id === s.activeRideId);
    if (!ride) return null;
    const location = ride.path[ride.path.length - 1] ?? ride.pickup;
    const risk: RiskAssessment | null = ride.risk;
    const stations = nearestStations(location);
    const message = `NariRide Emergency Alert: ${s.user?.name ?? "Passenger"} activated SOS during a ride. Current location: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}. Ride ID: ${ride.id}. Driver: ${ride.driver.name} (${ride.driver.vehicleNumber}). Destination: ${ride.destination.label}. [SIMULATED NOTIFICATION]`;
    const records = notifyContacts(ride, location, "sos", message);

    const incident: SafetyIncident = {
      id: makeId("SOS"),
      rideId: ride.id,
      passengerName: s.user?.name ?? "Passenger",
      passengerPhone: s.user?.phone ?? "—",
      driver: ride.driver,
      location,
      pickupLabel: ride.pickup.label,
      destinationLabel: ride.destination.label,
      riskScore: Math.max(risk?.score ?? 0, 92),
      riskLevel: "CRITICAL",
      deviationMeters: risk?.deviationMeters ?? 0,
      createdAt: Date.now(),
      status: "ACTIVE",
      notificationIds: records.map((r) => r.id),
      stations,
      timeline: [
        entry("sos", "SOS activated", `Ride ${ride.id}`, "CRITICAL"),
        entry("sos", "Location captured", `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`),
        entry("sos", "Contact alert generated", `${records.length} simulated notification(s) recorded`),
        entry("sos", "Nearest police stations identified", stations.map((st) => st.name).join(" · ")),
      ],
    };

    setState((prev) => ({
      ...prev,
      incidents: [...prev.incidents, incident],
      safetyCheck: null,
      rides: prev.rides.map((r) =>
        r.id === ride.id
          ? {
              ...r,
              sosActivated: true,
              peakLevel: "CRITICAL",
              timeline: [...r.timeline, entry("sos", "SOS activated", "Emergency workflow started", "CRITICAL")],
            }
          : r,
      ),
    }));
    return incident;
  }, [nearestStations, notifyContacts]);

  const setIncidentStatus = useCallback((id: string, status: IncidentStatus) => {
    setState((s) => ({
      ...s,
      incidents: s.incidents.map((i) =>
        i.id === id
          ? {
              ...i,
              status,
              timeline: [
                ...i.timeline,
                entry(
                  "sos",
                  status === "RESPONDING"
                    ? "Response started"
                    : status === "RESOLVED"
                      ? "Incident resolved"
                      : "Incident cancelled",
                ),
              ],
            }
          : i,
      ),
    }));
  }, []);

  const completeRide = useCallback(() => {
    const s = stateRef.current;
    if (!s.activeRideId) return;
    patchMatch(s.activeRideId, { status: "COMPLETED" });
    patchRide(s.activeRideId, (r) => ({
      ...r,
      status: "COMPLETED",
      endedAt: Date.now(),
      timeline: [...r.timeline, entry("ride", "Ride completed", "Safe arrival confirmed")],
    }));
    setState((prev) => ({ ...prev, activeRideId: null, sim: initialSimState, safetyCheck: null, confirmedSafeAt: null }));
  }, [patchRide]);

  const cancelRide = useCallback(
    (reason?: string) => {
      const s = stateRef.current;
      if (!s.activeRideId) return;
      patchMatch(s.activeRideId, {
        status: "CANCELLED_BY_RIDER",
        cancelReason: reason ?? "Cancelled by passenger",
        cancelledBy: "PASSENGER",
      });
      patchRide(s.activeRideId, (r) => ({
        ...r,
        status: "CANCELLED",
        cancelReason: reason ?? "Cancelled by passenger",
        cancelledBy: "PASSENGER",
        endedAt: Date.now(),
        timeline: [
          ...r.timeline,
          entry("ride", "Ride cancelled", reason ? `${reason} · partner notified` : "Partner notified through dispatch"),
        ],
      }));
      setState((prev) => ({ ...prev, activeRideId: null, sim: initialSimState, safetyCheck: null }));
    },
    [patchRide],
  );

  const settleRide = useCallback(
    ({ rideId, tip, rating, tags }: { rideId: string; tip: number; rating: number; tags: string[] }) => {
      const s = stateRef.current;
      const ride = s.rides.find((r) => r.id === rideId);
      if (!ride) return;
      const total = ride.fare + tip;
      patchMatch(rideId, { paymentStatus: "PAID", tip, fareFinal: total, driverRating: rating });
      patchRide(rideId, (r) => ({
        ...r,
        tip,
        rating,
        ratingTags: tags,
        paymentStatus: "PAID",
        timeline: [
          ...r.timeline,
          entry(
            "ride",
            `Payment of ₹${total} confirmed`,
            `${r.paymentMethod === "CASH" ? "Cash" : "UPI"}${tip ? ` · ₹${tip} tip` : ""} · rated ${rating}★`,
          ),
        ],
      }));
    },
    [patchRide],
  );




  const clearRideHistory = useCallback(() => {
    setState((s) => ({
      ...s,
      rides: s.rides.filter((r) => r.id === s.activeRideId),
      incidents: s.incidents.filter((i) => i.rideId === s.activeRideId),
      notifications: s.notifications.filter((n) => n.rideId === s.activeRideId),
    }));
  }, []);

  const setDemoMode = useCallback((on: boolean) => setState((s) => ({ ...s, demoMode: on })), []);

  const startDemo = useCallback(() => {
    setState((s) => ({ ...s, demoMode: true }));
    const ride = bookRide({
      pickup: { label: DEMO_PICKUP.label, lat: DEMO_PICKUP.lat, lng: DEMO_PICKUP.lng },
      destination: { label: DEMO_DESTINATION.label, lat: DEMO_DESTINATION.lat, lng: DEMO_DESTINATION.lng },
      rideType: "night",
      vehicleClass: "cab",
      paymentMethod: "UPI",
      trustedJourney: true,
      usePin: true,
    });
    patchRide(ride.id, (r) => ({ ...r, demo: true, nightMode: true }));
    setTimeout(() => startRide(), 60);
  }, [bookRide, patchRide, startRide]);

  const resetDemo = useCallback(() => {
    setState((s) => ({
      ...s,
      rides: s.rides.filter((r) => !r.demo),
      incidents: [],
      notifications: [],
      activeRideId: null,
      safetyCheck: null,
      sim: initialSimState,
      confirmedSafeAt: null,
    }));
  }, []);

  // Deterministic simulation loop — the only source of location while device GPS is off.
  useEffect(() => {
    if (!activeRide || activeRide.status !== "ACTIVE") return;
    if (state.useDeviceGps) return;
    if (state.sim.mode === "paused") return;
    const interval = window.setInterval(() => {
      const s = stateRef.current;
      const ride = s.rides.find((r) => r.id === s.activeRideId);
      if (!ride) return;
      const previous = ride.path[ride.path.length - 1] ?? null;
      const { state: next, point } = stepSimulation(ride.route, s.sim, previous, Date.now());
      setState((prev) => ({ ...prev, sim: next }));
      pushLocation(point);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [activeRide?.id, activeRide?.status, state.sim.mode, state.useDeviceGps, pushLocation]);

  /** Real-time matching: react to partner acceptance / trip stages / partner cancellation. */
  const applyMatches = useCallback(
    (list: MatchRecord[]) => {
      const s = stateRef.current;
      const id = s.activeRideId;
      if (!id) return;
      const match = list.find((m) => m.rideId === id);
      const ride = s.rides.find((r) => r.id === id);
      if (!match || !ride) return;

      if (match.status === "ACCEPTED" && match.partner && ride.status === "REQUESTED") {
        const p = match.partner;
        patchRide(id, (r) => ({
          ...r,
          status: "DRIVER_ASSIGNED",
          driver: {
            name: p.name,
            phone: p.phone,
            rating: p.rating,
            vehicle: `${p.vehicleType} · ${p.vehicleModel}`,
            vehicleNumber: p.vehicleNumber,
            avatarSeed: p.name.slice(0, 2).toUpperCase(),
            demo: true,
          },
          timeline: [
            ...r.timeline,
            entry("ride", "Partner accepted your ride", `${p.name} · ${p.vehicleModel} · ${p.vehicleNumber}`),
          ],
        }));
        return;
      }

      if (match.status === "CANCELLED_BY_PARTNER" && ride.status !== "CANCELLED" && ride.status !== "COMPLETED") {
        patchRide(id, (r) => ({
          ...r,
          status: "CANCELLED",
          cancelledBy: "PARTNER",
          cancelReason: match.cancelReason,
          endedAt: Date.now(),
          timeline: [
            ...r.timeline,
            entry("ride", "Partner cancelled the ride", match.cancelReason || "Rebook to find another captain"),
          ],
        }));
        setState((prev) => ({ ...prev, activeRideId: null, sim: initialSimState, safetyCheck: null }));
        return;
      }

      if (match.status === "ARRIVED" && ride.status === "DRIVER_ASSIGNED") {
        patchRide(id, (r) => ({
          ...r,
          timeline: [...r.timeline, entry("ride", "Partner arrived at pickup", "Share your ride PIN before boarding")],
        }));
        return;
      }

      if (match.otpVerified && !ride.otpVerified) {
        patchRide(id, (r) => ({
          ...r,
          otpVerified: true,
          timeline: [...r.timeline, entry("ride", "Ride PIN verified", "Captain confirmed your 4-digit PIN")],
        }));
      }

      if (match.paymentStatus === "PAID" && ride.paymentStatus !== "PAID") {
        patchRide(id, (r) => ({ ...r, paymentStatus: "PAID" }));
      }

      if (match.status === "STARTED" && ride.status !== "ACTIVE" && ride.status !== "COMPLETED") {
        startRide();
        return;
      }

      if (match.status === "COMPLETED" && (ride.status === "ACTIVE" || ride.status === "ARRIVED")) {
        completeRide();
      }
    },
    [patchRide, startRide, completeRide],
  );


  useEffect(() => {
    applyMatches(readMatches());
    return subscribeMatches(applyMatches);
  }, [applyMatches]);

  /** No partner accepted in time — fall back to the demo driver pool so demos never stall. */
  useEffect(() => {
    if (!activeRide || activeRide.status !== "REQUESTED") return;
    const t = window.setTimeout(() => {
      const s = stateRef.current;
      const ride = s.rides.find((r) => r.id === s.activeRideId);
      if (!ride || ride.status !== "REQUESTED") return;
      patchMatch(ride.id, {
        status: "ACCEPTED",
        partner: {
          name: ride.driver.name,
          phone: "+91 90000 00000",
          vehicleType: "Auto",
          vehicleModel: ride.driver.vehicle,
          vehicleNumber: ride.driver.vehicleNumber,
          rating: ride.driver.rating,
        },
      });
      patchRide(ride.id, (r) => ({
        ...r,
        status: "DRIVER_ASSIGNED",
        timeline: [...r.timeline, entry("ride", "Driver assigned", "No partner online — demo driver pool used")],
      }));
    }, 15000);
    return () => window.clearTimeout(t);
  }, [activeRide?.id, activeRide?.status, patchRide]);


  const value: Ctx = {
    state,
    activeRide,
    activeIncident,
    nightActive,
    register,
    login,
    logout,
    finishOnboarding,
    updateUser,
    addContact,
    updateContact,
    deleteContact,
    updateSettings,
    bookRide,
    startRide,
    cancelRide,
    completeRide,
    settleRide,
    pushLocation,
    setSimMode,
    setUseDeviceGps,
    setGpsMessage,
    respondSafetyCheck,
    openSafetyCheck,
    triggerSos,
    setIncidentStatus,
    clearRideHistory,
    startDemo,
    resetDemo,
    setDemoMode,
    nearestStations,
  };

  return <NariContext.Provider value={value}>{children}</NariContext.Provider>;
}

export function useNari(): Ctx {
  const ctx = useContext(NariContext);
  if (!ctx) throw new Error("useNari must be used inside NariProvider");
  return ctx;
}
