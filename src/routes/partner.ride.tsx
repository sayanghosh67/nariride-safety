import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Gauge, KeyRound, MapPin, Navigation, Phone, ShieldCheck, Star, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { NariMap } from "@/components/nari/map-view";
import { EmptyState, GlassCard, SectionTitle, SimulatedBadge, StatusPill } from "@/components/nari/ui-kit";
import { DEMO_POLICE_STATIONS } from "@/lib/nari/data";
import { CANCEL_REASONS_PARTNER, vehicleClass } from "@/lib/nari/fares";
import { buildRoute, distanceToRoute, formatDistance, haversine, routeLength } from "@/lib/nari/geo";
import { usePartner } from "@/lib/nari/partner-store";
import { SIM_LABELS, initialSimState, stepSimulation, type SimMode, type SimState } from "@/lib/nari/simulator";
import type { LocationPoint, SafetyLevel } from "@/lib/nari/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partner/ride")({
  head: () => ({
    meta: [
      { title: "Live trip navigation — NariRide Partner" },
      {
        name: "description",
        content:
          "Navigate the active NariRide trip: pickup confirmation, in-transit tracking, live route-deviation alerts and trip completion.",
      },
      { property: "og:title", content: "Live trip navigation — NariRide Partner" },
      {
        property: "og:description",
        content: "Partner trip controls with GPS simulation, deviation alerts and safety monitoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnerRideScreen,
});

const MODES: SimMode[] = ["normal", "minor", "suspicious", "severe", "return", "arrive", "paused"];

const NEXT_LABEL: Record<string, string> = {
  ACCEPTED: "Confirm pickup",
  ARRIVED: "Start trip",
  ONGOING: "Complete trip",
};

const STAGE_COPY: Record<string, { title: string; detail: string }> = {
  ACCEPTED: { title: "Heading to pickup", detail: "Navigate to the passenger and confirm the ride PIN." },
  ARRIVED: { title: "At pickup", detail: "Verify the PIN with the passenger, then start the trip." },
  ONGOING: { title: "In transit", detail: "Route is monitored live — stay on the suggested path." },
};

function levelFor(deviation: number): SafetyLevel {
  if (deviation < 50) return "SAFE";
  if (deviation < 150) return "MONITORING";
  if (deviation < 250) return "CAUTION";
  if (deviation < 400) return "HIGH_RISK";
  return "CRITICAL";
}

function PartnerRideScreen() {
  const { state, activeRequest, advance, verifyOtp, collectPayment, ratePassenger, cancelTrip } = usePartner();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateId, setRateId] = useState<string | null>(null);
  const [stars, setStars] = useState(5);

  const [sim, setSim] = useState<SimState>(initialSimState);
  const [trail, setTrail] = useState<LocationPoint[]>([]);
  const simRef = useRef(sim);
  simRef.current = sim;
  const trailRef = useRef(trail);
  trailRef.current = trail;
  const alertedRef = useRef(false);

  const tripId = activeRequest?.id ?? null;
  const status = activeRequest?.status ?? null;

  const route = useMemo(() => {
    if (!activeRequest) return [];
    const seed = [...activeRequest.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    return buildRoute(activeRequest.pickup, activeRequest.drop, seed);
  }, [activeRequest]);

  // Reset the trip simulation whenever a different trip becomes active.
  useEffect(() => {
    setSim(initialSimState);
    setTrail([]);
    alertedRef.current = false;
  }, [tripId]);

  // Auto-start the GPS stream when the trip goes in transit.
  useEffect(() => {
    if (status === "ONGOING" && simRef.current.mode === "paused") {
      setSim((s) => ({ ...s, mode: "normal" }));
    }
  }, [status]);

  // Deterministic GPS stream — same simulator the passenger safety engine consumes.
  useEffect(() => {
    if (!tripId || status !== "ONGOING" || route.length === 0) return;
    if (sim.mode === "paused") return;
    const interval = window.setInterval(() => {
      const previous = trailRef.current[trailRef.current.length - 1] ?? null;
      const { state: next, point } = stepSimulation(route, simRef.current, previous, Date.now());
      setSim(next);
      setTrail((t) => [...t, point].slice(-140));
    }, 2200);
    return () => window.clearInterval(interval);
  }, [tripId, status, route, sim.mode]);

  const current = trail[trail.length - 1] ?? null;
  const deviation = current && route.length ? distanceToRoute(current, route) : 0;
  const level = levelFor(deviation);
  const remaining = current && activeRequest ? haversine(current, activeRequest.drop) : activeRequest ? routeLength(route) : 0;
  const speedKmh = current?.speed ? Math.min(120, Math.round(current.speed * 3.6)) : 0;

  // One deviation alert per escalation — the partner is told before the passenger panics.
  useEffect(() => {
    if (deviation >= 150 && !alertedRef.current) {
      alertedRef.current = true;
      toast.warning("Route deviation detected", {
        description: `You are ${formatDistance(deviation)} off the monitored route. Return to the suggested path.`,
      });
    }
    if (deviation < 80) alertedRef.current = false;
  }, [deviation]);

  useEffect(() => {
    if (state.hydrated && !state.profile) void navigate({ to: "/partner/onboarding" });
  }, [state.hydrated, state.profile, navigate]);

  if (!state.profile) return null;

  if (!activeRequest) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-16 pt-6 safe-top">
        <SectionTitle title="Live trip" />
        {rateId ? (
          <GlassCard className="space-y-3 border-accent/40">
            <p className="text-sm font-semibold">Rate your passenger</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`Rate ${n} stars`} onClick={() => setStars(n)} className="p-1">
                  <Star
                    className={cn("size-7", n <= stars ? "fill-accent text-accent" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                ratePassenger(rateId, stars);
                setRateId(null);
                toast.success("Rating submitted");
                void navigate({ to: "/partner/earnings" });
              }}
              className="w-full rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              Submit rating
            </button>
          </GlassCard>
        ) : null}
        <EmptyState
          title="No active trip"
          detail="Accept a ride request from your dashboard to open live navigation."
          action={
            <Link
              to="/partner/dashboard"
              className="mt-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground"
            >
              Go to dashboard
            </Link>
          }
        />
      </div>
    );
  }

  const stage = STAGE_COPY[activeRequest.status] ?? STAGE_COPY["ONGOING"]!;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-16 pt-6 safe-top">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">{stage.title}</p>
          <h1 className="text-lg font-semibold tracking-tight">Trip with {activeRequest.passengerName}</h1>
        </div>
        <StatusPill level={level} />
      </div>

      <NariMap
        className="h-64 w-full rounded-2xl border border-border"
        route={route}
        pickup={{ ...activeRequest.pickup }}
        destination={{ ...activeRequest.drop }}
        current={current}
        trail={trail}
        level={level}
        deviationMeters={deviation}
        stations={DEMO_POLICE_STATIONS}
      />

      {deviation >= 150 ? (
        <GlassCard className="flex items-start gap-2.5 border-critical/50 bg-critical/10">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-critical">Route deviation alert</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {formatDistance(deviation)} off the monitored route. The passenger's safety engine is escalating — return to
              the suggested path or contact support.
            </p>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="space-y-3">
        <p className="text-xs text-muted-foreground">{stage.detail}</p>
        <div className="space-y-1.5 text-xs">
          <p className="flex items-center gap-2">
            <MapPin className="size-3.5 text-safe" aria-hidden="true" /> {activeRequest.pickup.label}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-3.5 text-primary" aria-hidden="true" /> {activeRequest.drop.label}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { icon: Navigation, label: "Remaining", value: formatDistance(remaining) },
            { icon: Gauge, label: "Speed", value: `${speedKmh} km/h` },
            { icon: Timer, label: "ETA", value: `${activeRequest.etaMinutes} min` },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-secondary/40 p-2">
              <m.icon className="mx-auto size-3.5 text-accent" aria-hidden="true" />
              <p className="mt-1 text-sm font-semibold tabular-nums">{m.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-xs">
          <span className="font-semibold">
            {vehicleClass(activeRequest.vehicleClass).label} · ₹{activeRequest.fare}
          </span>
          <span className="text-muted-foreground">
            {activeRequest.paymentMethod === "CASH" ? "Collect cash" : "UPI (passenger pays in app)"}
          </span>
        </div>
        {activeRequest.trustedJourney ? (
          <p className="flex items-center gap-1.5 text-[11px] text-accent">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Trusted journey — contacts are monitoring this route
          </p>
        ) : null}

        {activeRequest.status === "ARRIVED" && activeRequest.pin && !activeRequest.otpVerified ? (
          <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <KeyRound className="size-3.5" aria-hidden="true" /> Enter the passenger's 4-digit ride PIN
            </p>
            <div className="flex gap-2">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                aria-label="Ride PIN"
                placeholder="0000"
                className="w-full rounded-xl border border-input bg-secondary/60 px-3 py-2.5 text-center text-lg font-bold tracking-[0.4em] tabular-nums outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => {
                  if (verifyOtp(activeRequest.id, otp)) {
                    setOtp("");
                    toast.success("PIN verified — you can start the trip");
                  } else {
                    toast.error("Incorrect PIN", { description: "Ask the passenger to read it from her app" });
                  }
                }}
                className="shrink-0 rounded-xl bg-brand-gradient px-4 text-xs font-bold text-primary-foreground"
              >
                Verify
              </button>
            </div>
          </div>
        ) : null}

        {activeRequest.otpVerified ? (
          <p className="flex items-center gap-1.5 text-[11px] text-safe">
            <KeyRound className="size-3.5" aria-hidden="true" /> Ride PIN verified
          </p>
        ) : null}

        {activeRequest.status === "ONGOING" && activeRequest.paymentMethod === "CASH" ? (
          <button
            type="button"
            onClick={() => {
              collectPayment(activeRequest.id);
              toast.success(`₹${activeRequest.fare} cash marked as collected`);
            }}
            disabled={activeRequest.paymentStatus === "PAID"}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-xs font-semibold disabled:opacity-40"
          >
            {activeRequest.paymentStatus === "PAID" ? "Cash collected" : `Mark ₹${activeRequest.fare} cash collected`}
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${activeRequest.passengerPhone ?? "112"}`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-xs font-semibold"
          >
            <Phone className="size-3.5" aria-hidden="true" /> Call passenger
          </a>
          <button
            type="button"
            disabled={activeRequest.status === "ARRIVED" && Boolean(activeRequest.pin) && !activeRequest.otpVerified}
            onClick={() => {
              const id = activeRequest.id;
              const wasOngoing = activeRequest.status === "ONGOING";
              advance(id);
              if (wasOngoing) {
                setRateId(id);
                toast.success("Trip completed", { description: "Earnings added to your payout balance" });
              } else {
                toast.success(NEXT_LABEL[activeRequest.status] ?? "Updated");
              }
            }}
            className="rounded-xl bg-brand-gradient px-3 py-3 text-xs font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
          >
            {NEXT_LABEL[activeRequest.status] ?? "Complete trip"}
          </button>
        </div>

        {cancelOpen ? (
          <div className="space-y-2 rounded-xl border border-critical/40 bg-critical/10 p-3">
            <p className="text-xs font-semibold text-critical">Cancel this trip?</p>
            {CANCEL_REASONS_PARTNER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  cancelTrip(activeRequest.id, r);
                  toast.info("Trip cancelled", { description: r });
                  void navigate({ to: "/partner/dashboard" });
                }}
                className="w-full rounded-xl border border-border px-3 py-2 text-left text-[11px] font-semibold"
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="w-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
            >
              Keep trip
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="w-full rounded-xl px-3 py-2 text-[11px] font-semibold text-muted-foreground"
          >
            Cancel trip
          </button>
        )}
      </GlassCard>


      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Trip GPS simulator</p>
          <SimulatedBadge />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSim((s) => ({ ...s, mode: m }))}
              aria-pressed={sim.mode === m}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
                sim.mode === m ? "border-accent/60 bg-accent/15 text-accent" : "border-border bg-secondary/40",
              )}
            >
              {SIM_LABELS[m]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Deviation {formatDistance(deviation)} · tick {sim.tick} · progress {Math.round(sim.progress * 100)}%
          {activeRequest.status === "ONGOING" ? "" : " — starts once the trip is in transit"}
        </p>
      </GlassCard>

      <Link to="/partner/dashboard" className="block text-center text-xs font-semibold text-muted-foreground">
        Back to dashboard
      </Link>
    </div>
  );
}
