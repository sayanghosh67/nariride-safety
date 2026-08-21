import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { RiskIntelligence } from "@/components/nari/risk-panel";
import { EmptyState, GlassCard, SectionTitle } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";
import { ToggleRow } from "@/routes/book";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety intelligence & Night Mode — NariRide" },
      {
        name: "description",
        content: "See how your risk score is calculated, tune deviation thresholds and control Night Safety Mode.",
      },
      { property: "og:title", content: "Safety intelligence & Night Mode — NariRide" },
      { property: "og:description", content: "Explainable risk factors, thresholds and night-time protections." },
    ],
  }),
  component: () => (
    <Gate>
      <SafetyCentre />
    </Gate>
  ),
});

function SafetyCentre() {
  const { state, activeRide, nightActive, updateSettings } = useNari();
  const lastRide = activeRide ?? state.rides.find((r) => r.timeline.length > 1) ?? null;
  const s = state.settings;

  return (
    <AppShell title="Safety centre" subtitle="Explainable, on-device risk intelligence">
      <div className="space-y-4">
        <GlassCard strong className="space-y-2 border-accent/40">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Moon className="size-4 text-accent" aria-hidden="true" /> Night Safety Mode
            <span className={nightActive ? "text-safe" : "text-muted-foreground"}>{nightActive ? "Active" : "Idle"}</span>
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Between {s.nightStart}:00 and {s.nightEnd}:00 NariRide lowers deviation tolerance, shortens the grace period
            and escalates alerts faster.
          </p>
          <ToggleRow
            label="Enable Night Safety Mode"
            value={s.nightModeEnabled}
            onChange={(v) => updateSettings({ nightModeEnabled: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Night starts (h)"
              value={s.nightStart}
              min={12}
              max={23}
              onChange={(nightStart) => updateSettings({ nightStart })}
            />
            <NumberField
              label="Night ends (h)"
              value={s.nightEnd}
              min={0}
              max={11}
              onChange={(nightEnd) => updateSettings({ nightEnd })}
            />
          </div>
        </GlassCard>

        <div>
          <SectionTitle title="Live risk intelligence" />
          {lastRide ? (
            <RiskIntelligence risk={lastRide.risk} timeline={lastRide.timeline} />
          ) : (
            <EmptyState
              title="No journey data yet"
              detail="Start a ride to see live deviation distance, trend analysis and the factors behind your score."
              action={
                <Link to="/book" className="mt-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground">
                  Book a ride
                </Link>
              }
            />
          )}
        </div>

        <div>
          <SectionTitle title="Deviation thresholds" />
          <GlassCard className="space-y-3">
            {(
              [
                ["monitoring", "Monitoring"],
                ["caution", "Caution"],
                ["highRisk", "High risk"],
                ["critical", "Critical"],
              ] as const
            ).map(([key, label]) => (
              <NumberField
                key={key}
                label={`${label} (metres)`}
                value={s.deviationThresholds[key]}
                min={20}
                max={2000}
                step={10}
                onChange={(v) =>
                  updateSettings({ deviationThresholds: { ...s.deviationThresholds, [key]: v } })
                }
              />
            ))}
            <NumberField
              label="Grace period before alerting (seconds)"
              value={s.graceSeconds}
              min={0}
              max={180}
              step={5}
              onChange={(graceSeconds) => updateSettings({ graceSeconds })}
            />
          </GlassCard>
        </div>

        <div>
          <SectionTitle title="Alerting & privacy" />
          <GlassCard className="space-y-3">
            <ToggleRow
              icon={<Users className="size-4 text-accent" aria-hidden="true" />}
              label="Share trusted journey by default"
              detail="Trusted contacts receive simulated ride updates"
              value={s.trustedJourneyDefault}
              onChange={(trustedJourneyDefault) => updateSettings({ trustedJourneyDefault })}
            />
            <ToggleRow
              icon={<ShieldCheck className="size-4 text-accent" aria-hidden="true" />}
              label="Notify contacts at caution level"
              detail="Otherwise contacts are only alerted at high risk and SOS"
              value={s.notifyOnCaution}
              onChange={(notifyOnCaution) => updateSettings({ notifyOnCaution })}
            />
            <ToggleRow
              label="Share live location during rides"
              detail="Location is processed on your device and never leaves it in this prototype"
              value={s.shareLiveLocation}
              onChange={(shareLiveLocation) => updateSettings({ shareLiveLocation })}
            />
            <ToggleRow
              label="Reduced motion"
              detail="Minimise animated pulses and sweeps"
              value={s.reducedMotion}
              onChange={(reducedMotion) => updateSettings({ reducedMotion })}
            />
          </GlassCard>
        </div>

        <Link
          to="/contacts"
          className="block w-full rounded-2xl bg-brand-gradient px-4 py-3.5 text-center text-sm font-bold text-primary-foreground"
        >
          Manage trusted contacts
        </Link>
      </div>
    </AppShell>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-full rounded-xl border border-input bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
