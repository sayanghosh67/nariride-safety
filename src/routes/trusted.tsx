import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Share2, Users } from "lucide-react";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { EmptyState, GlassCard, SectionTitle, StatusPill } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";
import { ToggleRow } from "@/routes/book";

export const Route = createFileRoute("/trusted")({
  head: () => ({
    meta: [
      { title: "Trusted journey — NariRide" },
      {
        name: "description",
        content:
          "Share live ride status with trusted contacts: who is watching your journey, what they see and when they are alerted.",
      },
      { property: "og:title", content: "Trusted journey — NariRide" },
      { property: "og:description", content: "Share live ride status with the people you trust." },
    ],
  }),
  component: () => (
    <Gate>
      <TrustedJourney />
    </Gate>
  ),
});

function TrustedJourney() {
  const { state, activeRide, updateSettings } = useNari();
  const s = state.settings;

  return (
    <AppShell title="Trusted journey" subtitle="Share live status with people you trust" back="/">
      <div className="space-y-4">
        <GlassCard strong className="space-y-3 border-accent/40">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Share2 className="size-4 text-accent" aria-hidden="true" /> Live sharing
          </p>
          <ToggleRow
            label="Share trusted journey by default"
            detail="Every new ride starts with live status sharing on"
            value={s.trustedJourneyDefault}
            onChange={(trustedJourneyDefault) => updateSettings({ trustedJourneyDefault })}
          />
          <ToggleRow
            icon={<MapPin className="size-4 text-accent" aria-hidden="true" />}
            label="Share live location during rides"
            detail="Contacts see your position and route progress"
            value={s.shareLiveLocation}
            onChange={(shareLiveLocation) => updateSettings({ shareLiveLocation })}
          />
          <ToggleRow
            label="Notify contacts at caution level"
            detail="Otherwise contacts are alerted at high risk and SOS only"
            value={s.notifyOnCaution}
            onChange={(notifyOnCaution) => updateSettings({ notifyOnCaution })}
          />
        </GlassCard>

        <div>
          <SectionTitle title="Current journey" />
          {activeRide ? (
            <GlassCard className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {activeRide.pickup.label} → {activeRide.destination.label}
                </p>
                {activeRide.risk ? <StatusPill level={activeRide.risk.level} /> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeRide.trustedJourney
                  ? "Trusted contacts are receiving live updates for this ride."
                  : "Sharing is off for this ride — contacts are still alerted if you trigger SOS."}
              </p>
              <Link to="/ride" className="inline-block text-xs font-semibold text-accent">
                Open live ride
              </Link>
            </GlassCard>
          ) : (
            <EmptyState
              title="No active journey"
              detail="Book a ride to start sharing live status, route progress and safety level with your contacts."
              action={
                <Link
                  to="/book"
                  className="mt-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  Book a ride
                </Link>
              }
            />
          )}
        </div>

        <div>
          <SectionTitle
            title="Who is watching"
            action={
              <Link to="/contacts" className="text-xs font-semibold text-accent">
                Manage
              </Link>
            }
          />
          {state.contacts.length === 0 ? (
            <EmptyState
              title="No trusted contacts yet"
              detail="Add at least one person so live status and emergency alerts have somewhere to go."
              action={
                <Link
                  to="/contacts"
                  className="mt-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  Add a contact
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {state.contacts.map((c) => (
                <GlassCard key={c.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.relationship} · {c.phone}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                    <Users className="size-3" aria-hidden="true" /> {c.primary ? "Primary" : "Trusted"}
                  </span>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
