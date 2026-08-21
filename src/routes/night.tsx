import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, ShieldCheck, Sunrise } from "lucide-react";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { GlassCard, SectionTitle } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";
import { ToggleRow } from "@/routes/book";

export const Route = createFileRoute("/night")({
  head: () => ({
    meta: [
      { title: "Night Safety Mode — NariRide" },
      {
        name: "description",
        content:
          "Turn on Night Safety Mode for late-shift travel: tighter deviation limits, faster escalation and earlier contact alerts.",
      },
      { property: "og:title", content: "Night Safety Mode — NariRide" },
      {
        property: "og:description",
        content: "Late-shift travel protection with tighter deviation limits and faster alerts.",
      },
    ],
  }),
  component: () => (
    <Gate>
      <NightSafety />
    </Gate>
  ),
});

function NightSafety() {
  const { state, nightActive, updateSettings } = useNari();
  const s = state.settings;

  return (
    <AppShell title="Night safety" subtitle="Late-shift travel protection" back="/">
      <div className="space-y-4">
        <GlassCard strong className="space-y-3 border-accent/40">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Moon className="size-4 text-accent" aria-hidden="true" /> Night Safety Mode
            </p>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                nightActive
                  ? "border-safe/40 bg-safe/15 text-safe"
                  : "border-border bg-secondary/50 text-muted-foreground"
              }`}
            >
              {nightActive ? "Active now" : "Idle"}
            </span>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Between {s.nightStart}:00 and {s.nightEnd}:00 NariRide lowers deviation tolerance, shortens the grace period
            and escalates alerts faster.
          </p>
          <ToggleRow
            label="Enable Night Safety Mode"
            value={s.nightModeEnabled}
            onChange={(nightModeEnabled) => updateSettings({ nightModeEnabled })}
          />
          <div className="grid grid-cols-2 gap-2">
            <HourField
              label="Night starts (h)"
              value={s.nightStart}
              min={12}
              max={23}
              onChange={(nightStart) => updateSettings({ nightStart })}
            />
            <HourField
              label="Night ends (h)"
              value={s.nightEnd}
              min={0}
              max={11}
              onChange={(nightEnd) => updateSettings({ nightEnd })}
            />
          </div>
        </GlassCard>

        <div>
          <SectionTitle title="What changes after dark" />
          <GlassCard className="space-y-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              Deviation thresholds tighten, so smaller detours are flagged sooner.
            </p>
            <p className="flex items-start gap-2">
              <Moon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              The grace period before an alert is shortened and risk scores rise faster.
            </p>
            <p className="flex items-start gap-2">
              <Sunrise className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              Trusted contacts are notified earlier, including at caution level when enabled.
            </p>
          </GlassCard>
        </div>

        <div>
          <SectionTitle title="Night alerting" />
          <GlassCard className="space-y-3">
            <ToggleRow
              label="Notify contacts at caution level"
              detail="Otherwise contacts are alerted at high risk and SOS only"
              value={s.notifyOnCaution}
              onChange={(notifyOnCaution) => updateSettings({ notifyOnCaution })}
            />
            <ToggleRow
              label="Share trusted journey by default"
              detail="Automatically share live status on night rides"
              value={s.trustedJourneyDefault}
              onChange={(trustedJourneyDefault) => updateSettings({ trustedJourneyDefault })}
            />
          </GlassCard>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to="/safety"
            className="rounded-2xl border border-border bg-secondary/40 px-4 py-3.5 text-center text-sm font-semibold"
          >
            Tune thresholds
          </Link>
          <Link
            to="/book"
            className="rounded-2xl bg-brand-gradient px-4 py-3.5 text-center text-sm font-bold text-primary-foreground"
          >
            Book a night ride
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function HourField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
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
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-full rounded-xl border border-input bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
