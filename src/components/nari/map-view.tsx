import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { cn } from "@/lib/utils";
import type { LatLng, PoliceStation, SafetyLevel } from "@/lib/nari/types";

const MapViewClient = lazy(() => import("./map-view.client"));

export type MapProps = {
  route?: LatLng[] | undefined;
  pickup?: (LatLng & { label?: string }) | undefined;
  destination?: (LatLng & { label?: string }) | undefined;
  current?: LatLng | null | undefined;
  trail?: LatLng[] | undefined;
  level?: SafetyLevel | undefined;
  deviationMeters?: number | undefined;
  stations?: PoliceStation[] | undefined;
  className?: string | undefined;
};

function MapSkeleton({ className }: { className?: string | undefined }) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary/50", className)} aria-hidden="true">
      <div className="sweep absolute inset-y-0 -left-1/2 w-1/2 bg-accent/10" />
    </div>
  );
}

export function NariMap({ className, ...props }: MapProps) {
  return (
    <ClientOnly fallback={<MapSkeleton className={className} />}>
      <Suspense fallback={<MapSkeleton className={className} />}>
        <MapViewClient className={className} {...props} />
      </Suspense>
    </ClientOnly>
  );
}
