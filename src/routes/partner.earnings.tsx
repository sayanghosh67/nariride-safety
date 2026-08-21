import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDownToLine, BadgeIndianRupee, Banknote, CheckCircle2, Loader2, Percent, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { EmptyState, GlassCard, SectionTitle, SimulatedBadge, formatTime } from "@/components/nari/ui-kit";
import { SAFETY_LEVY, rupees } from "@/lib/nari/earnings";
import { usePartner } from "@/lib/nari/partner-store";

export const Route = createFileRoute("/partner/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings & payouts — NariRide Partner" },
      {
        name: "description",
        content:
          "Trip-wise NariRide partner earnings with commission breakdown, net payable per ride, payout balance and settlement history.",
      },
      { property: "og:title", content: "Earnings & payouts — NariRide Partner" },
      {
        property: "og:description",
        content: "See gross fare, platform commission, safety levy and net earnings per trip, plus payout status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnerEarnings,
});

function PartnerEarnings() {
  const { state, earnings, unpaidTrips, payoutAvailable, requestPayout } = usePartner();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.hydrated && !state.profile) void navigate({ to: "/partner/onboarding" });
  }, [state.hydrated, state.profile, navigate]);

  if (!state.profile) return null;
  const ratePct = Math.round(earnings.rate * 100);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-16 pt-6 safe-top">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Earnings</p>
          <h1 className="text-2xl font-semibold tracking-tight">Payout centre</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Commission, levies and settlements for {state.profile.name}
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <GlassCard strong className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Available to withdraw</p>
        <p className="text-4xl font-semibold tabular-nums">{rupees(payoutAvailable)}</p>
        <p className="text-[11px] text-muted-foreground">
          {unpaidTrips.length} unsettled trip{unpaidTrips.length === 1 ? "" : "s"} · today {rupees(earnings.today)} · last 7
          days {rupees(earnings.week)}
        </p>
        <button
          type="button"
          disabled={payoutAvailable <= 0}
          onClick={() => {
            requestPayout();
            toast.success("Payout requested", { description: "Instant UPI settlement simulated — status updates shortly" });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
        >
          <ArrowDownToLine className="size-4" aria-hidden="true" /> Withdraw to UPI
        </button>
      </GlassCard>

      <div>
        <SectionTitle title="Commission breakdown" />
        <GlassCard className="mt-3 space-y-2 text-sm">
          <Row label="Gross fare collected" value={rupees(earnings.gross)} />
          <Row
            label={`Platform commission (${ratePct}%)`}
            value={`− ${rupees(earnings.commission)}`}
            icon={<Percent className="size-3.5 text-caution" aria-hidden="true" />}
          />
          <Row
            label={`Safety & insurance levy (₹${SAFETY_LEVY}/trip)`}
            value={`− ${rupees(earnings.levy)}`}
            icon={<ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />}
          />
          <div className="border-t border-border pt-2">
            <Row label="Net earnings" value={rupees(earnings.net)} strong />
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {state.profile.gender === "female"
              ? "Women partner rate applied — 12% instead of the standard 15%."
              : "Standard partner rate of 15% applied."}{" "}
            Average net {rupees(earnings.perKm)}/km across {earnings.trips.length} trip
            {earnings.trips.length === 1 ? "" : "s"}.
          </p>
        </GlassCard>
      </div>

      <div>
        <SectionTitle title="Trip-wise earnings" />
        <div className="mt-3 space-y-2">
          {earnings.trips.length === 0 ? (
            <EmptyState title="No completed trips yet" detail="Finish a trip to see its fare split appear here." />
          ) : (
            earnings.trips.map((t) => (
              <GlassCard key={t.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.dropLabel}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.passengerName} · {t.distanceKm} km · {formatTime(t.at)}
                    </p>
                  </div>
                  <p className="text-base font-bold tabular-nums">{rupees(t.net)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <Cell label="Fare" value={rupees(t.gross)} />
                  <Cell label={`Comm. ${ratePct}%`} value={`−${rupees(t.commission)}`} />
                  <Cell label="Levy" value={`−${rupees(t.levy)}`} />
                </div>
                {t.trustedJourney ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-accent">
                    <ShieldCheck className="size-3.5" aria-hidden="true" /> Trusted journey monitored
                  </p>
                ) : null}
              </GlassCard>
            ))
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="Payout history" />
        <div className="mt-3 space-y-2">
          {state.payouts.length === 0 ? (
            <EmptyState title="No payouts yet" detail="Withdraw your balance to create a settlement record." />
          ) : (
            state.payouts.map((p) => (
              <GlassCard key={p.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {p.status === "PAID" ? (
                      <CheckCircle2 className="size-3.5 text-safe" aria-hidden="true" />
                    ) : (
                      <Loader2 className="size-3.5 animate-spin text-caution" aria-hidden="true" />
                    )}
                    {rupees(p.amount)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.method} · {p.tripIds.length} trip{p.tripIds.length === 1 ? "" : "s"} · ref {p.reference}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Requested {formatTime(p.requestedAt)}
                    {p.settledAt ? ` · settled ${formatTime(p.settledAt)}` : ""}
                  </p>
                </div>
                <span
                  className={
                    p.status === "PAID"
                      ? "rounded-full border border-safe/50 bg-safe/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-safe"
                      : "rounded-full border border-caution/50 bg-caution/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-caution"
                  }
                >
                  {p.status}
                </span>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      <GlassCard className="flex items-start gap-2.5">
        <Banknote className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-[11px] leading-snug text-muted-foreground">
          All amounts are prototype figures settled by a simulated payout engine — no payment provider is contacted and no
          money moves.
        </p>
      </GlassCard>

      <Link
        to="/partner/dashboard"
        className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-muted-foreground"
      >
        <BadgeIndianRupee className="size-3.5" aria-hidden="true" /> Back to dashboard
      </Link>
    </div>
  );
}

function Row({ label, value, strong, icon }: { label: string; value: string; strong?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`flex items-center gap-1.5 text-xs ${strong ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </span>
      <span className={`tabular-nums ${strong ? "text-base font-bold" : "text-sm font-semibold"}`}>{value}</span>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
