import { Activity, Compass, Gauge, ShieldCheck } from "lucide-react";

import { GlassCard, StatusPill, Timeline } from "@/components/nari/ui-kit";
import { formatDistance } from "@/lib/nari/geo";
import { LEVEL_META } from "@/lib/nari/risk";
import type { RiskAssessment, TimelineEntry } from "@/lib/nari/types";
import { cn } from "@/lib/utils";

export function RiskGauge({ risk }: { risk: RiskAssessment | null }) {
  const score = risk?.score ?? 0;
  const level = risk?.level ?? "SAFE";
  const meta = LEVEL_META[level];
  const angle = (score / 100) * 180;

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0" role="img" aria-label={`Risk score ${score} of 100, ${meta.label}`}>
        <svg viewBox="0 0 100 60" className="w-full">
          <path d="M8 54a42 42 0 0 1 84 0" fill="none" stroke="var(--muted)" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M8 54a42 42 0 0 1 84 0"
            fill="none"
            stroke={meta.hex}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 132} 999`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className={cn("text-2xl font-bold tabular-nums", meta.text)}>{score}</span>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">risk score</span>
        </div>
      </div>
      <div className="min-w-0 space-y-1.5">
        <StatusPill level={level} />
        <p className="text-xs leading-snug text-muted-foreground">
          {risk?.explanation ?? "Monitoring starts when your ride begins."}
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          Engine confidence {Math.round((risk?.confidence ?? 0.4) * 100)}%
        </p>
      </div>
    </div>
  );
}

export function RiskFactors({ risk }: { risk: RiskAssessment | null }) {
  if (!risk || risk.factors.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No risk factors are contributing right now. The journey matches the expected route.
      </p>
    );
  }
  const max = Math.max(...risk.factors.map((f) => Math.abs(f.points)), 10);
  return (
    <ul className="space-y-2.5">
      {risk.factors.map((f) => (
        <li key={f.key}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold">{f.label}</span>
            <span className={cn("text-xs font-bold tabular-nums", f.points < 0 ? "text-safe" : "text-caution")}>
              {f.points > 0 ? "+" : ""}
              {f.points}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", f.points < 0 ? "bg-safe" : "bg-brand-gradient")}
              style={{ width: `${(Math.abs(f.points) / max) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function RiskMetrics({ risk }: { risk: RiskAssessment | null }) {
  const items = [
    { icon: Compass, label: "Route deviation", value: formatDistance(risk?.deviationMeters ?? 0) },
    { icon: Activity, label: "Deviation time", value: `${risk?.deviationSeconds ?? 0}s` },
    { icon: Gauge, label: "To destination", value: formatDistance(risk?.distanceToDestination ?? 0) },
    {
      icon: ShieldCheck,
      label: "Direction",
      value: risk?.movingAway ? "Away from dest." : "Toward dest.",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-border bg-secondary/40 p-2.5">
          <i.icon className="size-4 text-accent" aria-hidden="true" />
          <p className="mt-1 text-sm font-semibold tabular-nums">{i.value}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

export function RiskIntelligence({
  risk,
  timeline,
}: {
  risk: RiskAssessment | null;
  timeline: TimelineEntry[];
}) {
  return (
    <div className="space-y-3">
      <GlassCard strong className="space-y-3">
        <RiskGauge risk={risk} />
        <RiskMetrics risk={risk} />
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Recommended action</p>
          <p className="mt-1 text-xs leading-snug">{risk?.recommendedAction ?? "No action needed."}</p>
        </div>
      </GlassCard>
      <GlassCard className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Contributing factors
        </p>
        <RiskFactors risk={risk} />
      </GlassCard>
      <GlassCard>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Safety timeline
        </p>
        <Timeline entries={timeline.filter((t) => t.kind !== "ride").slice(-14)} />
      </GlassCard>
    </div>
  );
}
