import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Clock, Home, ShieldCheck, Sparkles, User, Car } from "lucide-react";
import type { ReactNode } from "react";

import { NariWordmark } from "@/components/nari/logo";
import { ModeSwitch } from "@/components/nari/mode-switch";
import { SafetyCheckSheet } from "@/components/nari/safety-check-sheet";
import { StatusPill } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/book", label: "Rides", icon: Car },
  { to: "/safety", label: "Safety", icon: ShieldCheck },
  { to: "/history", label: "History", icon: Clock },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({
  children,
  title,
  subtitle,
  back,
  showNav = true,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  back?: string;
  showNav?: boolean;
}) {
  const { state, activeRide } = useNari();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onRideScreen = pathname === "/ride" || pathname === "/sos";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 glass safe-top rounded-none border-x-0 border-t-0 px-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          {back ? (
            <button
              type="button"
              onClick={() => void navigate({ to: back })}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
            >
              Back
            </button>
          ) : (
            <NariWordmark />
          )}
          <div className="flex items-center gap-2">
            <ModeSwitch />
            {state.demoMode ? (
              <Link
                to="/demo"
                className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent"
              >
                Demo mode
              </Link>
            ) : null}
            {activeRide?.risk ? <StatusPill level={activeRide.risk.level} /> : null}
          </div>
        </div>
        {title ? (
          <div className="mt-2">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : null}
      </header>

      {activeRide && !onRideScreen ? (
        <Link
          to="/ride"
          className="glass-strong mx-3 mt-3 flex items-center justify-between rounded-2xl px-4 py-3"
        >
          <span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent">
              <Sparkles className="size-3" aria-hidden="true" /> Active ride · safety monitoring active
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold">
              To {activeRide.destination.label}
            </span>
          </span>
          <span className="text-xs font-semibold text-accent">Open</span>
        </Link>
      ) : null}

      <main className={cn("flex-1 px-3 pb-28 pt-3", !showNav && "pb-6")}>{children}</main>

      {showNav ? (
        <nav
          aria-label="Primary"
          className="glass fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-3xl border-x-0 border-b-0 px-2 pt-2 safe-bottom"
        >
          <ul className="flex items-stretch justify-between">
            {TABS.map((tab) => (
              <li key={tab.to} className="flex-1">
                <Link
                  to={tab.to}
                  activeOptions={{ exact: tab.to === "/" }}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold text-muted-foreground transition-colors data-[status=active]:bg-surface-strong data-[status=active]:text-foreground"
                >
                  <tab.icon className="size-5" aria-hidden="true" />
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <SafetyCheckSheet />
    </div>
  );
}
