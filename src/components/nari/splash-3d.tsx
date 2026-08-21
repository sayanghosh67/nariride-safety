import { useEffect, useState, type ReactNode } from "react";

import { NariLogo } from "@/components/nari/logo";

/** 3-D animated brand loader: rotating orbit rings + floating emblem in perspective space. */
export function Splash3D({ label = "Securing your journey" }: { label?: string }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(60%_45%_at_50%_25%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_70%)]" />

      <div className="stage-3d relative grid size-56 place-items-center">
        <span className="ring-3d ring-3d-a" />
        <span className="ring-3d ring-3d-b" />
        <span className="ring-3d ring-3d-c" />
        <span className="emblem-3d">
          <NariLogo size={116} />
        </span>
      </div>

      <div className="relative">
        <p className="text-2xl font-semibold tracking-tight">
          <span className="text-brand-gradient">Nari</span>Ride
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          Every ride. Every route. Every woman, safe.
        </p>
      </div>

      <div className="relative h-1 w-44 overflow-hidden rounded-full bg-muted">
        <span className="sweep absolute inset-y-0 w-1/2 bg-brand-gradient" />
      </div>
      <p className="relative text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Shows the 3-D loader once per browser session while the app boots. */
export function BootLoader({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem("nariride.booted") === "1") {
      setBooting(false);
      return;
    }
    const t = window.setTimeout(() => {
      window.sessionStorage.setItem("nariride.booted", "1");
      setBooting(false);
    }, 2100);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {children}
      {booting ? (
        <div className="fixed inset-0 z-[100] bg-background">
          <Splash3D />
        </div>
      ) : null}
    </>
  );
}
