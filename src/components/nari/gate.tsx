import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { NariLogo } from "@/components/nari/logo";
import { useAuth } from "@/lib/nari/auth";
import { useNari } from "@/lib/nari/store";

export function SplashScreen({ label = "Securing your journey" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <NariLogo size={78} className="text-primary" />
      <div>
        <p className="text-2xl font-semibold">
          <span className="text-brand-gradient">Nari</span>Ride
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Every ride. Every route. Every woman, safe.
        </p>
      </div>
      <div className="relative h-1 w-40 overflow-hidden rounded-full bg-muted">
        <span className="sweep absolute inset-y-0 w-1/2 bg-brand-gradient" />
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Blocks protected screens until onboarding is done and a real account is signed in. */
export function Gate({ children }: { children: ReactNode }) {
  const { state } = useNari();
  const { ready, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.hydrated || !ready) return;
    if (!state.onboarded) void navigate({ to: "/onboarding" });
    else if (!session) void navigate({ to: "/auth" });
  }, [state.hydrated, state.onboarded, ready, session, navigate]);

  if (!state.hydrated || !ready) return <SplashScreen />;
  if (!state.onboarded || !session) return <SplashScreen label="Redirecting…" />;
  // Session exists but the cloud profile hasn't landed yet — never render with a null user.
  if (!state.user) return <SplashScreen label="Loading your profile…" />;
  return <>{children}</>;
}
