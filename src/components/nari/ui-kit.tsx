import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { LEVEL_META } from "@/lib/nari/risk";
import type { SafetyLevel, TimelineEntry } from "@/lib/nari/types";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={cn(strong ? "glass-strong" : "glass", "rounded-2xl p-4", className)}>{children}</div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between px-1">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function StatusPill({ level, className }: { level: SafetyLevel; className?: string }) {
  const meta = LEVEL_META[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        meta.bg,
        meta.border,
        meta.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function QuickAction({
  to,
  icon: Icon,
  label,
  detail,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="glass flex min-h-24 flex-col justify-between rounded-2xl p-3.5 transition-transform active:scale-[0.97]"
    >
      <Icon className="size-5 text-accent" aria-hidden="true" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{detail}</span>
      </span>
    </Link>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <GlassCard className="flex flex-col items-center gap-2 py-8 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{detail}</p>
      {action}
    </GlassCard>
  );
}

export function ErrorState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <GlassCard className="flex flex-col items-center gap-2 border-critical/40 py-6 text-center">
      <AlertTriangle className="size-6 text-critical" aria-hidden="true" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{detail}</p>
      {action}
    </GlassCard>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-caution/40 bg-caution/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-caution",
        className,
      )}
    >
      Simulated
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent",
        className,
      )}
    >
      Demo data
    </span>
  );
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="px-1 text-xs text-muted-foreground">No events recorded yet.</p>;
  }
  return (
    <ol className="relative space-y-3 pl-5">
      <span className="absolute left-1.5 top-1 h-[calc(100%-0.5rem)] w-px bg-border" aria-hidden="true" />
      {[...entries].reverse().map((e) => (
        <li key={e.id} className="relative">
          <span
            className={cn(
              "absolute -left-[1.05rem] top-1.5 size-2 rounded-full",
              e.kind === "sos" ? "bg-critical" : e.level ? LEVEL_META[e.level].dot : "bg-accent",
            )}
            aria-hidden="true"
          />
          <p className="text-xs font-semibold">
            <span className="text-muted-foreground">{formatTime(e.at)}</span> — {e.label}
          </p>
          {e.detail ? <p className="text-[11px] leading-snug text-muted-foreground">{e.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}
