import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Car, FlaskConical, LogOut, Shield, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { GlassCard, SectionTitle } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";
import { ToggleRow } from "@/routes/book";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — NariRide" },
      {
        name: "description",
        content: "Manage your NariRide profile, saved places, demo mode and privacy preferences.",
      },
      { property: "og:title", content: "Your profile — NariRide" },
      { property: "og:description", content: "Profile details, saved places, demo mode and privacy." },
    ],
  }),
  component: () => (
    <Gate>
      <Profile />
    </Gate>
  ),
});

const inputClass =
  "w-full rounded-xl border border-input bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-accent";

function Profile() {
  const { state, updateUser, setDemoMode, logout } = useNari();
  const navigate = useNavigate();
  const user = state.user!;

  return (
    <AppShell title="Profile" subtitle="Your details and preferences">
      <div className="space-y-4">
        <GlassCard strong className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-gradient text-lg font-bold text-primary-foreground">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.email} · {user.phone}
            </p>
          </div>
        </GlassCard>

        <div>
          <SectionTitle title="Saved places" />
          <GlassCard className="space-y-2">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Home</span>
              <input
                className={inputClass}
                value={user.homeLabel}
                onChange={(e) => updateUser({ homeLabel: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Work</span>
              <input
                className={inputClass}
                value={user.workLabel}
                onChange={(e) => updateUser({ workLabel: e.target.value })}
              />
            </label>
          </GlassCard>
        </div>

        <div>
          <SectionTitle title="Shortcuts" />
          <div className="space-y-2">
            <Link to="/contacts" className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <Users className="size-4 text-accent" aria-hidden="true" />
              <span className="text-sm font-semibold">Trusted contacts ({state.contacts.length})</span>
            </Link>
            <Link to="/safety" className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <Shield className="size-4 text-accent" aria-hidden="true" />
              <span className="text-sm font-semibold">Safety centre & Night Mode</span>
            </Link>
            <Link to="/dispatch" className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <Shield className="size-4 text-critical" aria-hidden="true" />
              <span className="text-sm font-semibold">Emergency response dashboard</span>
            </Link>
            <Link to="/partner" className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <Car className="size-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">Drive with NariRide (partner app)</span>
            </Link>
          </div>
        </div>

        <GlassCard>
          <ToggleRow
            icon={<FlaskConical className="size-4 text-accent" aria-hidden="true" />}
            label="Demo mode"
            detail="Show hackathon demo controls and scripted scenarios"
            value={state.demoMode}
            onChange={(v) => {
              setDemoMode(v);
              if (v) void navigate({ to: "/demo" });
            }}
          />
        </GlassCard>

        <button
          type="button"
          onClick={() => {
            logout();
            toast.info("Signed out");
            void navigate({ to: "/auth" });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3.5 text-sm font-semibold text-critical"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>

        <p className="text-[11px] leading-snug text-muted-foreground">
          NariRide prototype · all data stays on this device.
        </p>
      </div>
    </AppShell>
  );
}
