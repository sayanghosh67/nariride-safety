import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BellRing, MapPin, Phone, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { NariMap } from "@/components/nari/map-view";
import { EmptyState, GlassCard, SectionTitle, SimulatedBadge, Timeline, formatTime } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { title: "Emergency SOS active — NariRide" },
      {
        name: "description",
        content: "SOS status: location captured, trusted contacts alerted and nearest police stations listed.",
      },
      { property: "og:title", content: "Emergency SOS active — NariRide" },
      { property: "og:description", content: "Live emergency status with alert log and nearby help." },
    ],
  }),
  component: () => (
    <Gate>
      <SosScreen />
    </Gate>
  ),
});

function SosScreen() {
  const { state, activeIncident, setIncidentStatus } = useNari();
  const navigate = useNavigate();
  const incident = activeIncident ?? state.incidents[0] ?? null;

  if (!incident) {
    return (
      <AppShell title="Emergency" subtitle="No active emergency">
        <EmptyState
          title="No SOS on record"
          detail="If you ever feel unsafe, open your live ride and hold the SOS button."
          action={
            <Link to="/ride" className="mt-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground">
              Go to live ride
            </Link>
          }
        />
      </AppShell>
    );
  }

  const notifications = state.notifications.filter((n) => incident.notificationIds.includes(n.id));

  return (
    <AppShell title="SOS activated" subtitle={`Incident ${incident.id} · ${formatTime(incident.createdAt)}`}>
      <div className="space-y-4">
        <GlassCard strong className="space-y-3 border-critical/50">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-critical/20 text-critical">
              <ShieldAlert className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-critical">Emergency workflow running</p>
              <p className="text-[11px] text-muted-foreground">
                Status: {incident.status} · Risk {incident.riskScore}/100
              </p>
            </div>
          </div>
          <NariMap
            className="h-48 w-full rounded-2xl"
            current={incident.location}
            pickup={incident.location ? { ...incident.location, label: "SOS location" } : undefined}
            stations={incident.stations}
            level="CRITICAL"
          />
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden="true" />
            {incident.location
              ? `${incident.location.lat.toFixed(5)}, ${incident.location.lng.toFixed(5)}`
              : "Location unavailable"}
          </p>
        </GlassCard>

        <div>
          <SectionTitle title="Alerts sent to trusted contacts" action={<SimulatedBadge />} />
          <GlassCard className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground">No contacts were configured for this ride.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-1.5">
                      <BellRing className="size-3.5 text-accent" aria-hidden="true" /> {n.recipient}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-safe">{n.status}</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{n.message}</p>
                </div>
              ))
            )}
          </GlassCard>
        </div>

        <div>
          <SectionTitle title="Nearest police stations" />
          <GlassCard className="space-y-2">
            {incident.stations.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{st.name}</p>
                  <p className="text-[11px] text-muted-foreground">Demo record · nearest to your SOS location</p>
                </div>
              </div>
            ))}
            <a
              href="tel:112"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-critical/50 bg-critical/15 px-3 py-3 text-sm font-bold text-critical"
            >
              <Phone className="size-4" aria-hidden="true" /> Call emergency services (112)
            </a>
          </GlassCard>
        </div>

        <GlassCard>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Incident log</p>
          <Timeline entries={incident.timeline} />
        </GlassCard>

        <div className="grid gap-2">
          {incident.status === "ACTIVE" || incident.status === "RESPONDING" ? (
            <>
              <button
                type="button"
                onClick={() => setIncidentStatus(incident.id, "RESOLVED")}
                className="w-full rounded-2xl bg-safe px-4 py-3.5 text-sm font-bold text-safe-foreground"
              >
                I am safe now — resolve incident
              </button>
              <button
                type="button"
                onClick={() => setIncidentStatus(incident.id, "CANCELLED")}
                className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
              >
                Cancel — this was a false alarm
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="w-full rounded-2xl bg-brand-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground"
            >
              Back to home
            </button>
          )}
          <Link
            to="/dispatch"
            className="w-full rounded-2xl border border-border px-4 py-3 text-center text-sm font-semibold"
          >
            Open response dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
