import { Car, Star } from "lucide-react";

import { DemoBadge, GlassCard } from "@/components/nari/ui-kit";
import type { Ride } from "@/lib/nari/types";

export function DriverCard({ ride }: { ride: Ride }) {
  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Assigned driver</p>
        <DemoBadge />
      </div>
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-gradient text-base font-bold text-primary-foreground">
          {ride.driver.avatarSeed.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{ride.driver.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 text-caution" aria-hidden="true" />
            {ride.driver.rating.toFixed(1)} · {ride.driver.vehicle}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Car className="size-3" aria-hidden="true" /> Vehicle number
          </p>
          <p className="mt-0.5 font-semibold">{ride.driver.vehicleNumber}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ride PIN</p>
          <p className="mt-0.5 font-semibold tabular-nums">{ride.pin || "Not used"}</p>
        </div>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Driver and vehicle details are deterministic demo records generated for this prototype.
      </p>
    </GlassCard>
  );
}
