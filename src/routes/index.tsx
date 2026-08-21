import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, PhoneCall, Route as RouteIcon, ShieldCheck, Users, Sparkles } from "lucide-react";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { RiskGauge } from "@/components/nari/risk-panel";
import { GlassCard, QuickAction, SectionTitle, StatusPill } from "@/components/nari/ui-kit";
import { greeting, isNightNow } from "@/lib/nari/data";
import { useNari } from "@/lib/nari/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NariRide — Safety dashboard for every ride" },
      {
        name: "description",
        content:
          "Your NariRide home: book a monitored ride, check live safety status, manage trusted contacts and night safety mode.",
      },
      { property: "og:title", content: "NariRide — Safety dashboard for every ride" },
      {
        property: "og:description",
        content: "Book a monitored ride, view live risk intelligence and reach SOS in one tap.",
      },
    ],
  }),
  component: () => (
    <Gate>
      <HomeDashboard />
    </Gate>
  ),
});

function HomeDashboard() {
  const { state, activeRide } = useNari();
  const user = state.user!;
  const completed = state.rides.filter((r) => r.status === "COMPLETED");
  const safeRides = completed.filter((r) => !r.sosActivated && r.peakLevel !== "CRITICAL").length;
  const safetyScore = completed.length ? Math.round((safeRides / completed.length) * 100) : 100;
  const night = isNightNow(state.settings);

  return (
    <AppShell>
      <div className="space-y-4">
        <GlassCard strong className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{greeting()}</p>
              <p className="text-2xl font-semibold tracking-tight">{user.name}</p>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-brand-gradient text-sm font-bold text-primary-foreground">
              {user.avatarSeed}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {night
              ? "Night Safety Mode is active — enhanced route monitoring is enabled for your rides."
              : "Route monitoring, risk intelligence and SOS are ready whenever you travel."}
          </p>
          <Link
            to="/book"
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-4 text-base font-bold text-primary-foreground active:scale-[0.98]"
          >
            <RouteIcon className="size-5" aria-hidden="true" /> Book a monitored ride
          </Link>
        </GlassCard>

        {activeRide ? (
          <Link to="/ride" className="block">
            <GlassCard strong className="space-y-2 border-accent/40">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                  <Sparkles className="size-3" aria-hidden="true" /> Active ride
                </span>
                {activeRide.risk ? <StatusPill level={activeRide.risk.level} /> : null}
              </div>
              <p className="text-sm font-semibold">Safety monitoring active</p>
              <p className="text-xs text-muted-foreground">
                {activeRide.pickup.label} → {activeRide.destination.label}
              </p>
            </GlassCard>
          </Link>
        ) : null}

        <div>
          <SectionTitle title="Quick actions" />
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction to="/book" icon={RouteIcon} label="Book a ride" detail="Monitored journey" />
            <QuickAction to="/contacts" icon={PhoneCall} label="Emergency contacts" detail="Trusted people" />
            <QuickAction to="/night" icon={Moon} label="Night safety" detail="Late-shift travel" />
            <QuickAction to="/trusted" icon={Users} label="Trusted journey" detail="Share live status" />
          </div>
        </div>

        <div>
          <SectionTitle
            title="Safety summary"
            action={
              <Link to="/safety" className="text-xs font-semibold text-accent">
                Details
              </Link>
            }
          />
          <GlassCard className="space-y-4">
            <RiskGauge risk={activeRide?.risk ?? null} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
                <p className="text-lg font-bold tabular-nums">{completed.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rides</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
                <p className="text-lg font-bold tabular-nums text-safe">{safetyScore}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Safety score</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
                <p className="text-lg font-bold tabular-nums">{state.contacts.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Contacts</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div>
          <SectionTitle
            title="Recent rides"
            action={
              <Link to="/history" className="text-xs font-semibold text-accent">
                All
              </Link>
            }
          />
          {state.rides.length === 0 ? (
            <GlassCard className="text-xs text-muted-foreground">
              No rides yet. Book one, or run the guided walkthrough in Demo Mode.
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {[...state.rides]
                .reverse()
                .slice(0, 3)
                .map((r) => (
                  <GlassCard key={r.id} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.destination.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <StatusPill level={r.peakLevel} />
                  </GlassCard>
                ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction to="/demo" icon={Sparkles} label="Demo mode" detail="Guided walkthrough" />
          <QuickAction to="/dispatch" icon={ShieldCheck} label="Emergency desk" detail="Incident dashboard" />
        </div>
      </div>
    </AppShell>
  );
}
