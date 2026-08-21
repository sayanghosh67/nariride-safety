import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, IndianRupee, ShieldAlert, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { GlassCard, SectionTitle, StatusPill, Timeline, formatTime } from "@/components/nari/ui-kit";
import { fareFor, RATING_TAGS, TIP_OPTIONS, vehicleClass } from "@/lib/nari/fares";
import { useNari } from "@/lib/nari/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/arrival")({
  head: () => ({
    meta: [
      { title: "Safe arrival confirmed — NariRide" },
      {
        name: "description",
        content: "Your ride summary: peak risk level, deviation events and the alerts shared with trusted contacts.",
      },
      { property: "og:title", content: "Safe arrival confirmed — NariRide" },
      { property: "og:description", content: "Ride summary with peak risk and safety timeline." },
    ],
  }),
  component: () => (
    <Gate>
      <Arrival />
    </Gate>
  ),
});

function Arrival() {
  const { state, settleRide } = useNari();
  const navigate = useNavigate();
  const ride =
    [...state.rides].reverse().find((r) => r.status === "COMPLETED") ?? state.rides[state.rides.length - 1] ?? null;
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [tipChoice, setTipChoice] = useState(0);

  if (!ride) {
    void navigate({ to: "/" });
    return null;
  }

  const settled = ride.paymentStatus === "PAID";
  const tip = settled ? ride.tip : tipChoice;
  const setTip = setTipChoice;
  const quote = fareFor(ride.vehicleClass, ride.distanceKm, ride.nightMode);

  return (
    <AppShell title="You've arrived safely" subtitle={`Ride ${ride.id} summary`}>
      <div className="space-y-4">
        <GlassCard strong className="space-y-2 border-safe/50 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-safe/20 text-safe">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="text-base font-semibold">Safe arrival confirmed</p>
          <p className="text-[11px] text-muted-foreground">
            {ride.pickup.label} → {ride.destination.label} · {formatTime(ride.endedAt ?? ride.createdAt)}
          </p>
          <div className="flex justify-center">
            <StatusPill level={ride.peakLevel} />
          </div>
        </GlassCard>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Cell label="Distance" value={`${ride.distanceKm.toFixed(1)} km`} />
          <Cell label="GPS points" value={String(ride.path.length)} />
          <Cell label="Deviations" value={ride.deviationOccurred ? "Yes" : "None"} />
        </div>

        {ride.sosActivated ? (
          <GlassCard className="flex items-center gap-2 border-critical/40 text-xs text-critical">
            <ShieldAlert className="size-4" aria-hidden="true" /> An SOS was activated during this ride.
          </GlassCard>
        ) : null}

        <div>
          <SectionTitle title="Fare receipt" />
          <GlassCard className="space-y-1.5 text-xs">
            <Row label={`${vehicleClass(ride.vehicleClass).label} base fare`} value={`₹${quote.base}`} />
            <Row label={`Distance ${quote.km.toFixed(1)} km × ₹${quote.perKm}`} value={`₹${quote.distance}`} />
            {quote.nightFee ? <Row label="Night escort premium" value={`₹${quote.nightFee}`} /> : null}
            <Row label="Safety & monitoring fee" value={`₹${quote.safetyFee}`} />
            {tip ? <Row label="Tip for your captain" value={`₹${tip}`} /> : null}
            <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold">
              <span>{settled ? "Paid" : "Payable"} via {ride.paymentMethod === "CASH" ? "cash" : "UPI"}</span>
              <span className="tabular-nums">₹{ride.fare + tip}</span>
            </div>
          </GlassCard>
        </div>

        {settled ? (
          <GlassCard className="flex items-center gap-2 border-safe/40 text-xs text-safe">
            <IndianRupee className="size-4" aria-hidden="true" /> Payment confirmed
            {ride.rating ? ` · you rated ${vehicleClass(ride.vehicleClass).label} captain ${ride.rating}★` : ""}
          </GlassCard>
        ) : (
          <div>
            <SectionTitle title="Rate your captain" />
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n} stars`}
                    onClick={() => setStars(n)}
                    className="p-1"
                  >
                    <Star
                      className={cn("size-7", n <= stars ? "fill-accent text-accent" : "text-muted-foreground")}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {RATING_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                      tags.includes(t) ? "border-accent/60 bg-accent/15 text-accent" : "border-border text-muted-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add a tip</p>
                <div className="grid grid-cols-4 gap-2">
                  {TIP_OPTIONS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTip(amount)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-semibold tabular-nums",
                        tip === amount ? "border-accent/60 bg-accent/15 text-accent" : "border-border",
                      )}
                    >
                      {amount === 0 ? "No tip" : `₹${amount}`}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  settleRide({ rideId: ride.id, tip, rating: stars, tags });
                  toast.success(
                    ride.paymentMethod === "CASH"
                      ? `₹${ride.fare + tip} cash payment recorded`
                      : `₹${ride.fare + tip} paid via UPI`,
                  );
                }}
                className="w-full rounded-2xl bg-brand-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground"
              >
                {ride.paymentMethod === "CASH" ? "I paid cash" : `Pay ₹${ride.fare + tip} via UPI`} & submit rating
              </button>
            </GlassCard>
          </div>
        )}

        <div>
          <SectionTitle title="Journey timeline" />
          <GlassCard>
            <Timeline entries={ride.timeline.slice(-14)} />
          </GlassCard>
        </div>

        <div className="grid gap-2">
          <Link
            to="/"
            className="w-full rounded-2xl bg-brand-gradient px-4 py-3.5 text-center text-sm font-bold text-primary-foreground"
          >
            Back to home
          </Link>
          <Link to="/history" className="w-full rounded-2xl border border-border px-4 py-3 text-center text-sm font-semibold">
            View full history
          </Link>
        </div>

      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-2 py-3">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
