import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

import { LEVEL_META } from "@/lib/nari/risk";
import type { LatLng, PoliceStation, SafetyLevel } from "@/lib/nari/types";

export type MapViewProps = {
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

function pinIcon(color: string, glyph: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:grid;place-items:center;width:26px;height:26px;border-radius:999px;background:${color};color:oklch(0.16 0.03 255);font:700 11px/1 Sora,sans-serif;box-shadow:0 0 0 4px ${color}33">${glyph}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function MapViewClient({
  route = [],
  pickup,
  destination,
  current,
  trail = [],
  level = "SAFE",
  deviationMeters = 0,
  stations = [],
  className = "",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
    }).setView([22.57, 88.46], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const accent = "oklch(0.79 0.13 192)";
    const levelColor = LEVEL_META[level].hex;

    if (route.length > 1) {
      L.polyline(route.map((p) => [p.lat, p.lng] as [number, number]), {
        color: accent,
        weight: 5,
        opacity: 0.85,
        dashArray: "1 10",
        lineCap: "round",
      }).addTo(group);
    }
    if (trail.length > 1) {
      L.polyline(trail.map((p) => [p.lat, p.lng] as [number, number]), {
        color: levelColor,
        weight: 4,
        opacity: 0.9,
      }).addTo(group);
    }
    if (pickup) {
      L.marker([pickup.lat, pickup.lng], { icon: pinIcon("oklch(0.76 0.16 165)", "P") })
        .addTo(group)
        .bindTooltip(pickup.label ?? "Pickup");
    }
    if (destination) {
      L.marker([destination.lat, destination.lng], { icon: pinIcon("oklch(0.68 0.18 12)", "D") })
        .addTo(group)
        .bindTooltip(destination.label ?? "Destination");
    }
    for (const st of stations) {
      L.marker([st.lat, st.lng], { icon: pinIcon("oklch(0.79 0.13 210)", "★") })
        .addTo(group)
        .bindTooltip(st.name);
    }
    if (current) {
      L.circleMarker([current.lat, current.lng], {
        radius: 8,
        color: levelColor,
        fillColor: levelColor,
        fillOpacity: 1,
        weight: 3,
      }).addTo(group);
      if (deviationMeters > 40) {
        L.circle([current.lat, current.lng], {
          radius: Math.max(60, deviationMeters),
          color: levelColor,
          weight: 1,
          fillColor: levelColor,
          fillOpacity: 0.12,
        }).addTo(group);
      }
      map.panTo([current.lat, current.lng], { animate: true, duration: 0.6 });
    }

    if (!fittedRef.current) {
      const pts: L.LatLngExpression[] = [
        ...route.map((p) => [p.lat, p.lng] as L.LatLngExpression),
        ...(pickup ? [[pickup.lat, pickup.lng] as L.LatLngExpression] : []),
        ...(destination ? [[destination.lat, destination.lng] as L.LatLngExpression] : []),
      ];
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts).pad(0.25));
        fittedRef.current = true;
      }
    }
  }, [route, pickup, destination, current, trail, level, deviationMeters, stations]);

  return <div ref={containerRef} className={className} role="application" aria-label="Ride map" />;
}
