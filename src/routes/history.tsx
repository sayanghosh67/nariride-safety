import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Clock, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import {
  EmptyState,
  GlassCard,
  SectionTitle,
  SimulatedBadge,
  StatusPill,
  formatTime,
} from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Ride history & alert log — NariRide" },
      {
        name: "description",
        content: "Review past monitored rides, peak risk levels, deviation events and every simulated alert sent.",
      },
      { property: "og:title", content: "Ride history & alert log — NariRide" },
      { property: "og:description", content: "Past rides, peak risk, deviations and the full alert log." },
    ],
  }),
  component: () => (
    <Gate>
      <History />
    </Gate>
  ),
});

function History() {
  const { state, clearRideHistory } = useNari();
  const [tab, setTab] = useState<"rides" | "alerts" | "incidents">("rides");
  const past = state.rides.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED");

  return (
    <AppShell title="History" subtitle="Journeys, alerts and incidents">
      <div className="space-y-4">
        <div className="glass grid grid-cols-3 gap-1 rounded-2xl p-1">
          {(
            [
              ["rides", `Rides ${past.length}`],
              ["alerts", `Alerts ${state.notifications.length}`],
              ["incidents", `SOS ${state.incidents.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-xl py-2.5 text-xs font-semibold",
                tab === id ? "bg-brand-gradient text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "rides" ? (
          past.length === 0 ? (
            <EmptyState
              title="No completed rides yet"
              detail="Finish a ride or run Demo Mode to populate your safety history."
              action={
                <Link to="/demo" className="mt-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground">
                  Open Demo Mode
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {past.map((r) => (
                <GlassCard key={r.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {r.pickup.label} → {r.destination.label}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="size-3" aria-hidden="true" />
                        {formatTime(r.createdAt)} · {r.distanceKm.toFixed(1)} km · {r.id}
                      </p>
                    </div>
                    <StatusPill level={r.peakLevel} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-widest">
                    <Tag label={r.status} />
                    {r.nightMode ? <Tag label="Night mode" /> : null}
                    {r.deviationOccurred ? <Tag label="Deviation" tone="caution" /> : null}
                    {r.sosActivated ? <Tag label="SOS" tone="critical" /> : null}
                  </div>
                </GlassCard>
              ))}
              <button
                type="button"
                onClick={() => {
                  clearRideHistory();
                  toast.info("Ride history cleared");
                }}
                className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
              >
                Clear ride history
              </button>
            </div>
          )
        ) : null}

        {tab === "alerts" ? (
          state.notifications.length === 0 ? (
            <EmptyState title="No alerts recorded" detail="Alerts appear here whenever contacts are notified." />
          ) : (
            <div className="space-y-2">
              <SectionTitle title="Simulated notification log" action={<SimulatedBadge />} />
              {state.notifications.map((n) => (
                <GlassCard key={n.id} className="space-y-1">
                  <p className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-1.5">
                      <BellRing className="size-3.5 text-accent" aria-hidden="true" /> {n.recipient}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {formatTime(n.timestamp)}
                    </span>
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{n.message}</p>
                </GlassCard>
              ))}
            </div>
          )
        ) : null}

        {tab === "incidents" ? (
          state.incidents.length === 0 ? (
            <EmptyState title="No SOS incidents" detail="Every SOS you trigger is logged here with its full timeline." />
          ) : (
            <div className="space-y-2">
              {state.incidents.map((i) => (
                <GlassCard key={i.id} className="space-y-1 border-critical/40">
                  <p className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="size-4 text-critical" aria-hidden="true" /> {i.id}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.status}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatTime(i.createdAt)} · risk {i.riskScore}/100 · deviation {Math.round(i.deviationMeters)} m ·{" "}
                    {i.notificationIds.length} alert(s)
                  </p>
                </GlassCard>
              ))}
            </div>
          )
        ) : null}
      </div>
    </AppShell>
  );
}

function Tag({ label, tone = "muted" }: { label: string; tone?: "muted" | "caution" | "critical" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5",
        tone === "muted" && "border-border text-muted-foreground",
        tone === "caution" && "border-caution/50 bg-caution/10 text-caution",
        tone === "critical" && "border-critical/50 bg-critical/10 text-critical",
      )}
    >
      {label}
    </span>
  );
}
