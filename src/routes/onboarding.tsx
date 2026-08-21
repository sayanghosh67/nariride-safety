import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Route as RouteIcon, ShieldAlert, ShieldCheck, Home } from "lucide-react";
import { useState } from "react";

import { NariLogo } from "@/components/nari/logo";
import { GlassCard } from "@/components/nari/ui-kit";
import { locationService } from "@/lib/nari/location-service";
import { useNari } from "@/lib/nari/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "How NariRide keeps you safe — Onboarding" },
      {
        name: "description",
        content:
          "Learn how NariRide monitors route deviation, alerts you to unusual journeys and runs an instant SOS workflow.",
      },
      { property: "og:title", content: "How NariRide keeps you safe" },
      { property: "og:description", content: "Route monitoring, unusual-journey alerts, instant SOS, safe arrival." },
    ],
  }),
  component: Onboarding,
});

const SLIDES = [
  {
    icon: RouteIcon,
    title: "Your ride is monitored for unexpected route changes",
    body: "NariRide compares your live position against the expected route, continuously and on your device.",
  },
  {
    icon: ShieldCheck,
    title: "Get alerted when your journey behaves unusually",
    body: "Our Safety Intelligence Engine explains exactly why risk changed — never a vague warning.",
  },
  {
    icon: ShieldAlert,
    title: "Instantly activate SOS when you need help",
    body: "One protected tap captures your location, alerts trusted contacts and surfaces nearby police stations.",
  },
  {
    icon: Home,
    title: "Reach home safely",
    body: "Confirm safe arrival, or escalate instantly. Nothing is shared without your authorisation.",
  },
];

function Onboarding() {
  const [index, setIndex] = useState(0);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const { finishOnboarding } = useNari();
  const navigate = useNavigate();
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  const askLocation = async () => {
    const { error } = await locationService.getCurrent();
    setPermissionNote(
      error
        ? `${error.message} You can still use NariRide with the built-in journey simulator.`
        : "Location access granted. Tracking only runs during an active ride.",
    );
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 py-10 safe-top safe-bottom">
      <div className="flex items-center justify-between">
        <NariLogo size={34} className="text-primary" />
        <button
          type="button"
          onClick={() => {
            finishOnboarding();
            void navigate({ to: "/auth" });
          }}
          className="text-xs font-semibold text-muted-foreground"
        >
          Skip
        </button>
      </div>

      <div className="space-y-5">
        <div className="grid size-16 place-items-center rounded-3xl bg-brand-gradient text-primary-foreground">
          <slide.icon className="size-8" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">{slide.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{slide.body}</p>

        {last ? (
          <GlassCard className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4 text-accent" aria-hidden="true" /> Location permission
            </p>
            <p className="text-xs leading-snug text-muted-foreground">
              We need location access only to compare your live position with the expected route and to attach your
              position to an SOS. Tracking stops the moment a ride ends.
            </p>
            <button
              type="button"
              onClick={() => void askLocation()}
              className="w-full rounded-xl border border-accent/40 bg-accent/15 px-4 py-3 text-sm font-semibold text-accent"
            >
              Allow location access
            </button>
            {permissionNote ? <p className="text-[11px] text-muted-foreground">{permissionNote}</p> : null}
          </GlassCard>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-1.5 bg-muted")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            if (last) {
              finishOnboarding();
              void navigate({ to: "/auth" });
            } else setIndex((i) => i + 1);
          }}
          className="w-full rounded-2xl bg-brand-gradient px-4 py-4 text-base font-bold text-primary-foreground active:scale-[0.98]"
        >
          {last ? "Get started" : "Continue"}
        </button>
      </div>
    </div>
  );
}
