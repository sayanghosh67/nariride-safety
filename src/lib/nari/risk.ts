import { distanceToRoute, haversine } from "./geo";
import type {
  LatLng,
  LocationPoint,
  RiskAssessment,
  RiskFactor,
  SafetyLevel,
  SafetySettings,
} from "./types";

export const LEVEL_ORDER: SafetyLevel[] = ["SAFE", "MONITORING", "CAUTION", "HIGH_RISK", "CRITICAL"];

export const LEVEL_META: Record<
  SafetyLevel,
  { label: string; token: string; text: string; bg: string; border: string; dot: string; solid: string; hex: string }
> = {
  SAFE: {
    label: "Safe",
    token: "safe",
    text: "text-safe",
    bg: "bg-safe/15",
    border: "border-safe/40",
    dot: "bg-safe",
    solid: "bg-safe text-safe-foreground",
    hex: "oklch(0.76 0.16 165)",
  },
  MONITORING: {
    label: "Monitoring",
    token: "monitoring",
    text: "text-monitoring",
    bg: "bg-monitoring/15",
    border: "border-monitoring/40",
    dot: "bg-monitoring",
    solid: "bg-monitoring text-monitoring-foreground",
    hex: "oklch(0.79 0.13 210)",
  },
  CAUTION: {
    label: "Caution",
    token: "caution",
    text: "text-caution",
    bg: "bg-caution/15",
    border: "border-caution/40",
    dot: "bg-caution",
    solid: "bg-caution text-caution-foreground",
    hex: "oklch(0.83 0.16 88)",
  },
  HIGH_RISK: {
    label: "High risk",
    token: "risk",
    text: "text-risk",
    bg: "bg-risk/15",
    border: "border-risk/40",
    dot: "bg-risk",
    solid: "bg-risk text-risk-foreground",
    hex: "oklch(0.72 0.18 47)",
  },
  CRITICAL: {
    label: "Critical",
    token: "critical",
    text: "text-critical",
    bg: "bg-critical/20",
    border: "border-critical/50",
    dot: "bg-critical",
    solid: "bg-critical text-critical-foreground",
    hex: "oklch(0.63 0.23 22)",
  },
};

export function levelFromScore(score: number): SafetyLevel {
  if (score <= 25) return "SAFE";
  if (score <= 50) return "MONITORING";
  if (score <= 70) return "CAUTION";
  if (score <= 85) return "HIGH_RISK";
  return "CRITICAL";
}

export function isHigher(a: SafetyLevel, b: SafetyLevel): boolean {
  return LEVEL_ORDER.indexOf(a) > LEVEL_ORDER.indexOf(b);
}

export const DEFAULT_THRESHOLDS = { monitoring: 50, caution: 150, highRisk: 250, critical: 400 };

export type RiskInput = {
  path: LocationPoint[];
  route: LatLng[];
  destination: LatLng;
  settings: SafetySettings;
  nightMode: boolean;
  sosActivated: boolean;
  passengerConfirmedSafeAt: number | null;
};

/**
 * NariRide Safety Intelligence Engine — a local, explainable risk model.
 * No external AI service: every point of the score is attributable to a factor.
 */
export function assessRisk(input: RiskInput): RiskAssessment {
  const { path, route, destination, settings, nightMode, sosActivated, passengerConfirmedSafeAt } = input;
  const now = path.length ? path[path.length - 1]!.timestamp : Date.now();
  const current = path[path.length - 1] ?? null;
  const th = settings.deviationThresholds;

  if (!current) {
    return {
      score: 0,
      level: "SAFE",
      confidence: 0.4,
      factors: [],
      explanation: "Waiting for the first GPS fix before scoring the journey.",
      recommendedAction: "No action needed. Monitoring begins with the first location update.",
      deviationMeters: 0,
      deviationSeconds: 0,
      distanceToDestination: 0,
      movingAway: false,
      at: now,
    };
  }

  // Accuracy filtering: ignore very poor fixes for the deviation measurement.
  const usable = path.filter((p) => p.accuracy <= 80);
  const reference = usable.length ? usable : path;
  const referenceCurrent = reference[reference.length - 1]!;

  const deviationMeters = distanceToRoute(referenceCurrent, route);
  const distanceToDestination = haversine(referenceCurrent, destination);

  // Consecutive deviation duration above the monitoring threshold (with grace period).
  let deviationSince: number | null = null;
  for (let i = reference.length - 1; i >= 0; i--) {
    const d = distanceToRoute(reference[i]!, route);
    if (d > th.monitoring) deviationSince = reference[i]!.timestamp;
    else break;
  }
  const deviationSeconds = deviationSince ? Math.max(0, Math.round((now - deviationSince) / 1000)) : 0;

  // Trend toward / away from destination over the last window.
  const window = reference.slice(-6);
  const earlier = window[0]!;
  const deltaToDestination = haversine(earlier, destination) - distanceToDestination;
  const movingAway = deltaToDestination < -60;

  const speeds = path.slice(-6).map((p) => p.speed ?? 0);
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const stopped = path.length >= 4 && speeds.slice(-4).every((s) => s < 1.2);

  // Repeated deviation episodes across the whole ride.
  let episodes = 0;
  let inEpisode = false;
  for (const p of reference) {
    const dev = distanceToRoute(p, route) > th.monitoring;
    if (dev && !inEpisode) episodes++;
    inEpisode = dev;
  }

  const factors: RiskFactor[] = [];
  const add = (key: string, label: string, points: number, detail: string) => {
    if (points > 0) factors.push({ key, label, points: Math.round(points), detail });
  };

  // 1. Deviation distance (graded, hysteresis via grace period below).
  let devPoints = 0;
  if (deviationMeters > th.critical) devPoints = 46;
  else if (deviationMeters > th.highRisk) devPoints = 36;
  else if (deviationMeters > th.caution) devPoints = 26;
  else if (deviationMeters > th.monitoring) devPoints = 14;
  const gracePassed = deviationSeconds >= settings.graceSeconds;
  if (!gracePassed) devPoints = Math.round(devPoints * 0.45);
  add(
    "deviation",
    "Route deviation",
    devPoints,
    `Vehicle is ${Math.round(deviationMeters)} m from the expected route${
      gracePassed ? "" : " (inside grace period)"
    }.`,
  );

  // 2. Deviation duration.
  const durationPoints = Math.min(18, Math.floor(deviationSeconds / 15) * 4);
  add(
    "duration",
    "Deviation duration",
    durationPoints,
    `Off-route for ${deviationSeconds}s continuously.`,
  );

  // 3. Movement away from destination.
  if (movingAway) {
    add(
      "away",
      "Moving away from destination",
      14,
      `Distance to destination increased by ${Math.round(Math.abs(deltaToDestination))} m recently.`,
    );
  }

  // 4. Unusual stop while off-route.
  if (stopped && deviationMeters > th.monitoring) {
    add("stop", "Unusual stop off-route", 10, "Vehicle has stopped at a location away from the route.");
  }

  // 5. Speed anomaly.
  if (avgSpeed > 22) {
    add("speed", "Speed anomaly", 6, `Average speed ${Math.round(avgSpeed * 3.6)} km/h is unusually high.`);
  }

  // 6. Repeated deviation.
  if (episodes >= 2) {
    add("repeat", "Repeated deviations", 6, `${episodes} separate off-route episodes during this ride.`);
  }

  // 7. Night travel.
  if (nightMode) {
    add("night", "Night travel window", 5, "Ride is inside your configured night safety hours.");
  }

  // 8. SOS overrides everything.
  if (sosActivated) {
    add("sos", "SOS activated", 100, "You activated the emergency workflow for this ride.");
  }

  let score = factors.reduce((sum, f) => sum + f.points, 0);

  // Passenger confirmation dampens the score for a while (hysteresis).
  if (!sosActivated && passengerConfirmedSafeAt && now - passengerConfirmedSafeAt < 120000) {
    const damp = Math.round(score * 0.35);
    if (damp > 0) {
      factors.push({
        key: "confirmed",
        label: "Passenger confirmed safe",
        points: -damp,
        detail: "You confirmed you are safe, so risk is reduced while monitoring continues.",
      });
      score -= damp;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const level = sosActivated ? "CRITICAL" : levelFromScore(score);

  // Confidence from GPS accuracy and sample count.
  const accuracyPenalty = Math.min(0.35, (referenceCurrent.accuracy - 10) / 200);
  const samplePenalty = path.length < 4 ? 0.2 : 0;
  const confidence = Math.max(0.35, Math.min(0.99, 0.97 - accuracyPenalty - samplePenalty));

  return {
    score,
    level,
    confidence,
    factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    explanation: buildExplanation({
      level,
      deviationMeters,
      deviationSeconds,
      movingAway,
      stopped,
      sosActivated,
      nightMode,
    }),
    recommendedAction: recommend(level),
    deviationMeters,
    deviationSeconds,
    distanceToDestination,
    movingAway,
    at: now,
  };
}

function buildExplanation(o: {
  level: SafetyLevel;
  deviationMeters: number;
  deviationSeconds: number;
  movingAway: boolean;
  stopped: boolean;
  sosActivated: boolean;
  nightMode: boolean;
}): string {
  if (o.sosActivated) {
    return "Risk is CRITICAL because you activated SOS. An incident record has been created and your journey data is attached to it.";
  }
  if (o.level === "SAFE") {
    if (o.deviationMeters > 60) {
      return `The vehicle is ${Math.round(o.deviationMeters)} m from the expected route, but only for ${o.deviationSeconds}s — still inside the grace period used to absorb GPS noise and traffic detours. Scoring escalates if it persists.`;
    }
    return `The vehicle is ${Math.round(o.deviationMeters)} m from the expected route, which is within normal GPS and traffic variation.`;
  }
  const parts = [
    `the vehicle has been ${Math.round(o.deviationMeters)} m away from the expected route for ${o.deviationSeconds}s`,
  ];
  if (o.movingAway) parts.push("it is moving farther from the destination");
  if (o.stopped) parts.push("it has stopped at an unexpected location");
  if (o.nightMode) parts.push("the ride is inside your night safety hours");
  return `Risk increased because ${parts.join(", and ")}.`;
}

function recommend(level: SafetyLevel): string {
  switch (level) {
    case "SAFE":
      return "No action needed. Monitoring continues in the background.";
    case "MONITORING":
      return "Keep the app open. We will alert you if the deviation grows.";
    case "CAUTION":
      return "Confirm your status when asked, and consider sharing this journey with a trusted contact.";
    case "HIGH_RISK":
      return "Ask the driver to return to the expected route. Keep SOS within reach.";
    case "CRITICAL":
      return "Activate SOS if you feel unsafe. Emergency contacts and nearby police stations will be surfaced immediately.";
  }
}
