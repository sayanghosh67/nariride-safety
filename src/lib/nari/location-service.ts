import type { LocationPoint } from "./types";

export type LocationError = {
  code: "unsupported" | "denied" | "unavailable" | "timeout" | "accuracy";
  message: string;
};

function toPoint(pos: GeolocationPosition): LocationPoint {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? 50,
    timestamp: pos.timestamp ?? Date.now(),
    speed: pos.coords.speed ?? null,
    heading: pos.coords.heading ?? null,
    source: "gps",
  };
}

function mapError(err: GeolocationPositionError): LocationError {
  if (err.code === 1) return { code: "denied", message: "Location permission was denied. NariRide can still run in simulation mode." };
  if (err.code === 2) return { code: "unavailable", message: "GPS is unavailable on this device right now." };
  return { code: "timeout", message: "Getting your location took too long. Try again or use simulation." };
}

export const locationService = {
  supported(): boolean {
    return typeof navigator !== "undefined" && "geolocation" in navigator;
  },

  async getCurrent(): Promise<{ point: LocationPoint | null; error: LocationError | null }> {
    if (!this.supported()) {
      return { point: null, error: { code: "unsupported", message: "This browser does not expose a Geolocation API." } };
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ point: toPoint(pos), error: null }),
        (err) => resolve({ point: null, error: mapError(err) }),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
      );
    });
  },

  /** Continuous tracking — only used during an authorised safety session. */
  watch(
    onPoint: (p: LocationPoint) => void,
    onError: (e: LocationError) => void,
  ): () => void {
    if (!this.supported()) {
      onError({ code: "unsupported", message: "This browser does not expose a Geolocation API." });
      return () => {};
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const point = toPoint(pos);
        if (point.accuracy > 150) {
          onError({ code: "accuracy", message: `Low GPS accuracy (${Math.round(point.accuracy)} m) — filtering this fix.` });
          return;
        }
        onPoint(point);
      },
      (err) => onError(mapError(err)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  },
};
