import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, IndianRupee, ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";

import { NariLockup } from "@/components/nari/logo";
import { GlassCard, SectionTitle } from "@/components/nari/ui-kit";
import { usePartner } from "@/lib/nari/partner-store";

export const Route = createFileRoute("/partner/")({
  head: () => ({
    meta: [
      { title: "Drive with NariRide — Partner Programme" },
      {
        name: "description",
        content:
          "Become a NariRide partner driver: quick onboarding, women-first ride pool, transparent earnings and built-in safety monitoring.",
      },
      { property: "og:title", content: "Drive with NariRide — Partner Programme" },
      {
        property: "og:description",
        content: "Onboard in minutes, go online and accept women-first rides with live safety monitoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnerLanding,
});

const PERKS = [
  { icon: IndianRupee, title: "Transparent earnings", body: "Per-ride fare and daily totals shown before you accept." },
  { icon: ShieldCheck, title: "Safety-first dispatch", body: "Every trip is route-monitored; SOS reaches responders instantly." },
  { icon: TrendingUp, title: "Priority for women drivers", body: "Women partners are matched first on NariNight escorts." },
  { icon: BadgeCheck, title: "Simple verification", body: "Upload licence, RC and police clearance — reviewed in one step." },
];

function PartnerLanding() {
  const { state, todayEarnings } = usePartner();
  const profile = state.profile;

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-8 safe-top">
      <div className="flex flex-col items-center text-center">
        <NariLockup width={230} />
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Partner programme</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Drive with NariRide and be part of the safety network
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Onboard as a rider partner, go online and accept women-first rides — with the same live route monitoring
          passengers get.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {profile ? (
          <GlassCard className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{profile.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3 text-caution" aria-hidden="true" />
                  {profile.rating.toFixed(1)} · {profile.vehicleModel} · {profile.vehicleNumber}
                </p>
              </div>
              <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                {profile.verification.replace("_", " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rides completed</p>
                <p className="mt-0.5 font-semibold tabular-nums">{state.completed.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Earnings</p>
                <p className="mt-0.5 font-semibold tabular-nums">₹{todayEarnings}</p>
              </div>
            </div>
            <Link
              to="/partner/dashboard"
              className="block rounded-2xl bg-brand-gradient px-4 py-3.5 text-center text-sm font-bold text-primary-foreground active:scale-[0.98]"
            >
              Open partner dashboard
            </Link>
          </GlassCard>
        ) : (
          <Link
            to="/partner/onboarding"
            className="block rounded-2xl bg-brand-gradient px-4 py-4 text-center text-base font-bold text-primary-foreground active:scale-[0.98]"
          >
            Start partner onboarding
          </Link>
        )}
        <Link
          to="/"
          className="block rounded-2xl border border-border px-4 py-3 text-center text-sm font-semibold text-muted-foreground"
        >
          I'm a passenger — open the rider app
        </Link>
      </div>

      <div className="mt-8">
        <SectionTitle title="Why partners join" />
        <div className="mt-3 grid gap-3">
          {PERKS.map((perk) => (
            <GlassCard key={perk.title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground">
                <perk.icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{perk.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{perk.body}</span>
              </span>
            </GlassCard>
          ))}
        </div>
      </div>

      <GlassCard className="mt-6 flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-[11px] leading-snug text-muted-foreground">
          Prototype notice: verification, ride offers and payouts are simulated locally on this device. No paid APIs or
          external services are used.
        </p>
      </GlassCard>
    </div>
  );
}
