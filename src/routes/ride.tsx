import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, MessageSquare, Navigation, Phone, Satellite, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/nari/app-shell";
import { DriverCard } from "@/components/nari/driver-card";
import { Gate } from "@/components/nari/gate";
import { NariMap } from "@/components/nari/map-view";
import { RiskGauge, RiskMetrics } from "@/components/nari/risk-panel";
import { SimControls } from "@/components/nari/sim-controls";
import { SosButton } from "@/components/nari/sos-button";
import { EmptyState, GlassCard, SectionTitle, Timeline } from "@/components/nari/ui-kit";
import { ToggleRow } from "@/routes/book";
import { CANCEL_REASONS_PASSENGER, vehicleClass } from "@/lib/nari/fares";
import { locationService } from "@/lib/nari/location-service";
import { useNari } from "@/lib/nari/store";

export const Route = createFileRoute("/ride")({
  head: () => ({
    meta: [
      { title: "Live ride tracking — NariRide" },
      {
        name: "description",
        content: "Follow your live ride on the map with continuous route-deviation monitoring and one-tap SOS.",
      },
      { property: "og:title", content: "Live ride tracking — NariRide" },
      { property: "og:description", content: "Live map, risk score, safety timeline and instant SOS access." },
    ],
  }),
  component: () => (
    <Gate>
      <LiveRide />
    </Gate>
  ),
});

function LiveRide() {
  const { state, activeRide, startRide, cancelRide, completeRide, triggerSos, pushLocation, setUseDeviceGps, setGpsMessage } =
    useNari();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);

  // Device GPS session — only while the ride is active and the user opted in.
  useEffect(() => {
    if (!activeRide || activeRide.status !== "ACTIVE" || !state.useDeviceGps) return;
    const stop = locationService.watch(
      (point) => pushLocation(point),
      (error) => setGpsMessage(error.message),
    );
    return stop;
  }, [activeRide?.id, activeRide?.status, state.useDeviceGps, pushLocation, setGpsMessage]);

  if (!activeRide) {
    return (
      <AppShell title="Live ride" subtitle="No ride is currently active">
        <EmptyState
          title="No active ride"
          detail="Book a ride to start GPS tracking, route monitoring and live risk scoring."
          action={
            <Link to="/book" className="mt-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground">
              Book a ride
            </Link>
          }
        />
      </AppShell>
    );
  }

  const current = activeRide.path[activeRide.path.length - 1] ?? null;

  return (
    <AppShell title={`Ride ${activeRide.id}`} subtitle={`${activeRide.pickup.label} → ${activeRide.destination.label}`}>
      <div className="space-y-4">
        <GlassCard strong className="space-y-0 overflow-hidden p-0">
          <NariMap
            className="h-72 w-full"
            route={activeRide.route}
            pickup={{ ...activeRide.pickup }}
            destination={{ ...activeRide.destination }}
            current={current}
            trail={activeRide.path}
            level={activeRide.risk?.level ?? "SAFE"}
            deviationMeters={activeRide.risk?.deviationMeters ?? 0}
          />
          <div className="space-y-3 p-4">
            <RiskGauge risk={activeRide.risk} />
            <RiskMetrics risk={activeRide.risk} />
          </div>
        </GlassCard>

        {activeRide.status === "REQUESTED" ? (
          <GlassCard className="space-y-2 border-accent/40">
            <p className="text-sm font-semibold">Matching you with a nearby partner…</p>
            <p className="text-xs text-muted-foreground">
              Your request is live on the NariRide partner network. Verified women-first partners can accept it now; if none
              respond we assign a standby driver automatically.
            </p>
            <div className="sweep h-1 w-full rounded-full bg-accent/20" aria-hidden="true" />
          </GlassCard>
        ) : activeRide.status === "DRIVER_ASSIGNED" ? (
          <>
            <GlassCard className="space-y-3 border-accent/50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Ride PIN</p>
                  <p className="text-xs text-muted-foreground">Share only with your assigned captain</p>
                </div>
                <p className="text-2xl font-black tracking-[0.35em] tabular-nums">{activeRide.pin || "----"}</p>
              </div>
              <p
                className={
                  activeRide.otpVerified
                    ? "flex items-center gap-1.5 rounded-xl border border-safe/40 bg-safe/10 p-2.5 text-[11px] text-safe"
                    : "flex items-center gap-1.5 rounded-xl border border-caution/40 bg-caution/10 p-2.5 text-[11px] text-caution"
                }
              >
                <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
                {activeRide.otpVerified
                  ? "PIN verified by your captain — you can board."
                  : "Waiting for your captain to verify the PIN at pickup."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${activeRide.driver.phone ?? "112"}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold"
                >
                  <Phone className="size-3.5" aria-hidden="true" /> Call captain
                </a>
                <Link
                  to="/trusted"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold"
                >
                  <MessageSquare className="size-3.5" aria-hidden="true" /> Share status
                </Link>
              </div>
            </GlassCard>
            <button
              type="button"
              onClick={() => {
                startRide();
                toast.success("Ride started — safety monitoring active");
              }}
              className="w-full rounded-2xl bg-brand-gradient px-4 py-4 text-base font-bold text-primary-foreground"
            >
              Start ride & begin monitoring
            </button>
          </>
        ) : (
          <SosButton
            onActivate={() => {
              const incident = triggerSos();
              if (incident) void navigate({ to: "/sos" });
            }}
          />
        )}

        <GlassCard className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {vehicleClass(activeRide.vehicleClass).label} · ₹{activeRide.fare}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeRide.paymentMethod === "CASH" ? "Cash on drop" : "UPI in-app"} ·{" "}
              {activeRide.paymentStatus === "PAID" ? "Paid" : "Payment pending"}
            </p>
          </div>
          <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
            {activeRide.distanceKm.toFixed(1)} km
          </span>
        </GlassCard>



        {activeRide.status === "ARRIVED" ? (
          <GlassCard className="space-y-3 border-safe/40">
            <p className="text-sm font-semibold">You've reached your destination.</p>
            <button
              type="button"
              onClick={() => {
                completeRide();
                void navigate({ to: "/arrival" });
              }}
              className="w-full rounded-2xl bg-safe px-4 py-3.5 text-sm font-bold text-safe-foreground"
            >
              Confirm safe arrival
            </button>
          </GlassCard>
        ) : null}

        <DriverCard ride={activeRide} />

        <GlassCard className="space-y-3">
          <ToggleRow
            icon={<Satellite className="size-4 text-accent" aria-hidden="true" />}
            label="Use device GPS"
            detail="Off: the deterministic journey simulator drives the ride."
            value={state.useDeviceGps}
            onChange={(v) => {
              setUseDeviceGps(v);
              setGpsMessage(null);
            }}
          />
          {state.gpsMessage ? (
            <p className="flex items-start gap-1.5 rounded-xl border border-caution/40 bg-caution/10 p-2.5 text-[11px] text-caution">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {state.gpsMessage}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            Accuracy {current ? `${Math.round(current.accuracy)} m` : "—"} · Speed{" "}
            {current?.speed != null ? `${Math.min(120, Math.round(current.speed * 3.6))} km/h` : "—"} · Heading{" "}
            {current?.heading != null ? `${Math.round(current.heading)}°` : "—"}
          </p>
        </GlassCard>

        {!state.useDeviceGps && activeRide.status === "ACTIVE" ? <SimControls /> : null}

        <div>
          <SectionTitle
            title="Journey timeline"
            action={
              <Link to="/safety" className="flex items-center gap-1 text-xs font-semibold text-accent">
                <Navigation className="size-3" aria-hidden="true" /> Risk intelligence
              </Link>
            }
          />
          <GlassCard>
            <Timeline entries={activeRide.timeline.slice(-12)} />
          </GlassCard>
        </div>

        {cancelOpen ? (
          <GlassCard className="space-y-2 border-danger/40">
            <p className="text-sm font-semibold">Why are you cancelling?</p>
            {CANCEL_REASONS_PASSENGER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  cancelRide(r);
                  toast.info("Ride cancelled", { description: r });
                  void navigate({ to: "/" });
                }}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-left text-xs font-semibold"
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground"
            >
              Keep my ride
            </button>
          </GlassCard>
        ) : (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
          >
            Cancel ride
          </button>
        )}

      </div>
    </AppShell>
  );
}
