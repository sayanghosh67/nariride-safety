import { FlaskConical } from "lucide-react";

import { GlassCard, SimulatedBadge } from "@/components/nari/ui-kit";
import { SIM_LABELS, type SimMode } from "@/lib/nari/simulator";
import { useNari } from "@/lib/nari/store";
import { cn } from "@/lib/utils";

const MODES: SimMode[] = ["normal", "minor", "suspicious", "severe", "return", "arrive", "paused"];

const HELP: Record<SimMode, string> = {
  normal: "Follows the expected route exactly.",
  minor: "Small offset — monitoring only.",
  suspicious: "Sustained offset — caution and safety check.",
  severe: "Large offset — high risk escalation.",
  return: "Steers the vehicle back onto the route.",
  arrive: "Jumps to the destination to test safe arrival.",
  paused: "Freezes the GPS stream.",
};

export function SimControls() {
  const { state, setSimMode } = useNari();
  const mode = state.sim.mode;

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <FlaskConical className="size-4 text-accent" aria-hidden="true" /> Journey simulator
        </p>
        <SimulatedBadge />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSimMode(m)}
            aria-pressed={mode === m}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
              mode === m ? "border-accent/60 bg-accent/15 text-accent" : "border-border bg-secondary/40 text-foreground",
            )}
          >
            {SIM_LABELS[m]}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {HELP[mode]} Tick {state.sim.tick} · offset {Math.round(state.sim.offset)} m · progress{" "}
        {Math.round(state.sim.progress * 100)}%
      </p>
    </GlassCard>
  );
}
