import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, IndianRupee, MapPin, Navigation, Power, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { NariWordmark } from "@/components/nari/logo";
import { EmptyState, GlassCard, SectionTitle, formatTime } from "@/components/nari/ui-kit";
import { vehicleClass } from "@/lib/nari/fares";
import { usePartner } from "@/lib/nari/partner-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partner/dashboard")({
  head: () => ({
    meta: [
      { title: "Partner dashboard — NariRide" },
      {
        name: "description",
        content: "Go online, accept women-first ride requests, track trip progress and daily earnings as a NariRide partner.",
      },
      { property: "og:title", content: "Partner dashboard — NariRide" },
      { property: "og:description", content: "Live ride offers, trip stages and earnings for NariRide rider partners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnerDashboard,
});

const NEXT_LABEL: Record<string, string> = {
  ACCEPTED: "Arrived at pickup",
  ARRIVED: "Start ride",
  ONGOING: "Complete ride",
};

function PartnerDashboard() {
  const { state, activeRequest, todayEarnings, setOnline, accept, decline, advance } = usePartner();
  const navigate = useNavigate();
  const profile = state.profile;

  useEffect(() => {
    if (state.hydrated && !state.profile) void navigate({ to: "/partner/onboarding" });
  }, [state.hydrated, state.profile, navigate]);

  if (!profile) return null;

  const offers = state.requests.filter((r) => r.status === "OFFERED");
  const verified = profile.verification === "APPROVED";

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-16 pt-6 safe-top">
      <div className="flex items-center justify-between">
        <NariWordmark />
        <Link to="/partner" className="text-xs font-semibold text-muted-foreground">
          Partner home
        </Link>
      </div>

      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.vehicleType} · {profile.vehicleNumber}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
              verified ? "border-safe/50 bg-safe/15 text-safe" : "border-caution/50 bg-caution/15 text-caution",
            )}
          >
            {profile.verification.replace("_", " ")}
          </span>
        </div>
        <button
          type="button"
          disabled={!verified}
          onClick={() => {
            setOnline(!state.online);
            toast.success(state.online ? "You are offline" : "You are online — matching rides");
          }}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-bold active:scale-[0.98] disabled:opacity-40",
            state.online ? "border border-border text-foreground" : "bg-brand-gradient text-primary-foreground",
          )}
        >
          <Power className="size-4" aria-hidden="true" />
          {state.online ? "Go offline" : "Go online"}
        </button>
        {!verified ? (
          <p className="text-[11px] text-muted-foreground">
            Verification in progress — this takes a couple of seconds in the prototype, then you can go online.
          </p>
        ) : null}
      </GlassCard>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Earnings", value: `₹${todayEarnings}`, icon: IndianRupee },
          { label: "Trips", value: String(state.completed.length), icon: Navigation },
          { label: "Rating", value: profile.rating.toFixed(1), icon: ShieldCheck },
        ].map((stat) => (
          <GlassCard key={stat.label} className="px-2 py-3">
            <stat.icon className="mx-auto size-4 text-accent" aria-hidden="true" />
            <p className="mt-1 text-base font-semibold tabular-nums">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/partner/ride"
          className="rounded-xl border border-border px-3 py-3 text-center text-xs font-semibold"
        >
          Live trip navigation
        </Link>
        <Link
          to="/partner/earnings"
          className="rounded-xl border border-border px-3 py-3 text-center text-xs font-semibold"
        >
          Earnings & payouts
        </Link>
      </div>


      {activeRequest ? (
        <GlassCard className="space-y-3 border-primary/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Current trip</p>
          <p className="text-sm font-semibold">{activeRequest.passengerName}</p>
          <div className="space-y-1.5 text-xs">
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5 text-safe" aria-hidden="true" /> {activeRequest.pickup.label}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5 text-primary" aria-hidden="true" /> {activeRequest.drop.label}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-3.5" aria-hidden="true" /> {activeRequest.etaMinutes} min ·{" "}
              {activeRequest.distanceKm} km · ₹{activeRequest.fare}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {vehicleClass(activeRequest.vehicleClass).label} ·{" "}
            {activeRequest.paymentMethod === "CASH" ? "Cash on drop" : "UPI in app"}
            {activeRequest.pin ? ` · PIN ${activeRequest.otpVerified ? "verified" : "pending"}` : ""}
          </p>
          {activeRequest.status === "ARRIVED" ? (
            <Link
              to="/partner/ride"
              className="block w-full rounded-2xl bg-brand-gradient px-4 py-3.5 text-center text-sm font-bold text-primary-foreground"
            >
              Verify PIN & start trip
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => advance(activeRequest.id)}
              className="w-full rounded-2xl bg-brand-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.98]"
            >
              {NEXT_LABEL[activeRequest.status] ?? "Complete ride"}
            </button>
          )}
        </GlassCard>
      ) : null}

      <div>
        <SectionTitle title={state.online ? "Ride requests" : "Offline"} />
        <div className="mt-3 space-y-3">
          {!state.online ? (
            <EmptyState title="You're offline" detail="Go online to start receiving women-first ride requests." />
          ) : offers.length === 0 ? (
            <EmptyState title="Searching for rides" detail="New requests appear here every few seconds while online." />
          ) : (
            offers.map((r) => (
              <GlassCard key={r.id} className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{r.passengerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.distanceKm} km · {r.etaMinutes} min · {formatTime(r.createdAt)}
                    </p>
                  </div>
                  <p className="text-base font-bold tabular-nums">₹{r.fare}</p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                  {vehicleClass(r.vehicleClass).label} · {r.paymentMethod === "CASH" ? "Cash" : "UPI"}
                </p>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-safe" aria-hidden="true" /> {r.pickup.label}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" aria-hidden="true" /> {r.drop.label}
                  </p>
                </div>
                {r.trustedJourney ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-accent">
                    <ShieldCheck className="size-3.5" aria-hidden="true" /> Trusted journey — contacts are monitoring
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => decline(r.id)}
                    className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      accept(r.id);
                      toast.success("Ride accepted", { description: `Pick up ${r.passengerName}` });
                    }}
                    className="rounded-xl bg-brand-gradient px-3 py-2.5 text-xs font-bold text-primary-foreground"
                  >
                    Accept
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {state.completed.length ? (
        <div>
          <SectionTitle title="Completed trips" />
          <div className="mt-3 space-y-2">
            {state.completed.slice(0, 6).map((r) => (
              <GlassCard key={r.id} className="flex items-center justify-between py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.drop.label}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {r.passengerName} · {r.distanceKm} km
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">₹{r.fare}</span>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
