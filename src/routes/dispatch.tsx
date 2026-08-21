import { createFileRoute } from "@tanstack/react-router";
import { Activity, MapPin, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/nari/app-shell";
import { NariMap } from "@/components/nari/map-view";
import {
  EmptyState,
  GlassCard,
  SectionTitle,
  SimulatedBadge,
  StatusPill,
  Timeline,
  formatTime,
} from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";
import type { IncidentStatus } from "@/lib/nari/types";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Emergency response dashboard — NariRide" },
      {
        name: "description",
        content: "Responder view of active NariRide incidents with location, risk score, driver details and alert log.",
      },
      { property: "og:title", content: "Emergency response dashboard — NariRide" },
      { property: "og:description", content: "Triage active incidents, mark responding and resolve." },
    ],
  }),
  component: Dispatch,
});

const NEXT: { status: IncidentStatus; label: string; className: string }[] = [
  { status: "RESPONDING", label: "Mark responding", className: "border-caution/50 bg-caution/15 text-caution" },
  { status: "RESOLVED", label: "Resolve", className: "border-safe/50 bg-safe/15 text-safe" },
  { status: "CANCELLED", label: "False alarm", className: "border-border text-muted-foreground" },
];

function Dispatch() {
  const { state, setIncidentStatus } = useNari();
  const incidents = [...state.incidents].sort((a, b) => b.createdAt - a.createdAt);
  const active = incidents.filter((i) => i.status === "ACTIVE" || i.status === "RESPONDING");

  return (
    <AppShell title="Response dashboard" subtitle="Operator view · prototype data" back="/" showNav={false}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Active" value={String(active.length)} tone="critical" />
          <Metric label="Total SOS" value={String(incidents.length)} />
          <Metric label="Alerts" value={String(state.notifications.length)} />
        </div>

        <SectionTitle title="Incident queue" action={<SimulatedBadge />} />

        {incidents.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            detail="Incidents appear here the moment a passenger activates SOS."
            action={
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Activity className="size-3.5" aria-hidden="true" /> Monitoring
              </span>
            }
          />
        ) : (
          <div className="space-y-3">
            {incidents.map((i) => (
              <GlassCard key={i.id} strong className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <ShieldAlert className="size-4 text-critical" aria-hidden="true" /> {i.id}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTime(i.createdAt)} · ride {i.rideId} · {i.status}
                    </p>
                  </div>
                  <StatusPill level={i.riskLevel} />
                </div>

                <NariMap
                  className="h-40 w-full rounded-2xl"
                  current={i.location}
                  stations={i.stations}
                  level={i.riskLevel}
                />

                <dl className="grid grid-cols-2 gap-2 text-[11px]">
                  <Row label="Passenger" value={`${i.passengerName} · ${i.passengerPhone}`} />
                  <Row label="Driver" value={`${i.driver.name} · ${i.driver.vehicleNumber}`} />
                  <Row label="Route" value={`${i.pickupLabel} → ${i.destinationLabel}`} />
                  <Row label="Deviation" value={`${Math.round(i.deviationMeters)} m · risk ${i.riskScore}/100`} />
                </dl>

                {i.location ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {i.location.lat.toFixed(5)}, {i.location.lng.toFixed(5)}
                  </p>
                ) : null}

                <Timeline entries={i.timeline.slice(-8)} />

                <div className="grid grid-cols-3 gap-2">
                  {NEXT.map((n) => (
                    <button
                      key={n.status}
                      type="button"
                      disabled={i.status === n.status}
                      onClick={() => {
                        setIncidentStatus(i.id, n.status);
                        toast.success(`${i.id} → ${n.status}`);
                      }}
                      className={`rounded-xl border px-2 py-2.5 text-[11px] font-bold disabled:opacity-40 ${n.className}`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "critical" }) {
  return (
    <div className="glass rounded-2xl px-3 py-3 text-center">
      <p className={tone === "critical" ? "text-xl font-bold text-critical" : "text-xl font-bold"}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold leading-snug">{value}</dd>
    </div>
  );
}
