export type LatLng = { lat: number; lng: number };

export type SafetyLevel = "SAFE" | "MONITORING" | "CAUTION" | "HIGH_RISK" | "CRITICAL";

export type LocationPoint = LatLng & {
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
  source: "gps" | "simulated";
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  primary?: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarSeed: string;
  homeLabel: string;
  workLabel: string;
  passwordHash: string;
};

export type Driver = {
  name: string;
  phone?: string;
  rating: number;
  vehicle: string;
  vehicleNumber: string;
  avatarSeed: string;
  demo: true;
};

export type RiskFactor = {
  key: string;
  label: string;
  points: number;
  detail: string;
};

export type RiskAssessment = {
  score: number;
  level: SafetyLevel;
  confidence: number;
  factors: RiskFactor[];
  explanation: string;
  recommendedAction: string;
  deviationMeters: number;
  deviationSeconds: number;
  distanceToDestination: number;
  movingAway: boolean;
  at: number;
};

export type TimelineEntry = {
  id: string;
  at: number;
  label: string;
  detail?: string;
  level?: SafetyLevel;
  kind: "ride" | "safety" | "sos" | "system";
};

export type RideStatus = "REQUESTED" | "DRIVER_ASSIGNED" | "ACTIVE" | "ARRIVED" | "COMPLETED" | "CANCELLED";

export type Ride = {
  id: string;
  pickup: { label: string } & LatLng;
  destination: { label: string } & LatLng;
  route: LatLng[];
  rideType: string;
  vehicleClass: string;
  paymentMethod: "CASH" | "UPI";
  paymentStatus: "PENDING" | "PAID";
  fare: number;
  tip: number;
  rating?: number;
  ratingTags?: string[];
  cancelReason?: string;
  cancelledBy?: "PASSENGER" | "PARTNER";
  otpVerified?: boolean;
  pin: string;
  trustedJourney: boolean;
  nightMode: boolean;
  driver: Driver;
  status: RideStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  distanceKm: number;
  etaMinutes: number;
  path: LocationPoint[];
  risk: RiskAssessment | null;
  peakLevel: SafetyLevel;
  deviationOccurred: boolean;
  sosActivated: boolean;
  timeline: TimelineEntry[];
  demo: boolean;
};

export type PoliceStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demo: true;
};

export type NotificationRecord = {
  id: string;
  recipient: string;
  phone: string;
  message: string;
  timestamp: number;
  location: LatLng | null;
  rideId: string;
  status: "SIMULATED_SENT" | "SIMULATED_DELIVERED";
  kind: "sos" | "journey" | "arrival";
};

export type IncidentStatus = "ACTIVE" | "RESPONDING" | "RESOLVED" | "CANCELLED";

export type SafetyIncident = {
  id: string;
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  driver: Driver;
  location: LatLng | null;
  pickupLabel: string;
  destinationLabel: string;
  riskScore: number;
  riskLevel: SafetyLevel;
  deviationMeters: number;
  createdAt: number;
  status: IncidentStatus;
  notificationIds: string[];
  stations: PoliceStation[];
  timeline: TimelineEntry[];
};

export type SafetySettings = {
  nightModeEnabled: boolean;
  nightStart: number;
  nightEnd: number;
  trustedJourneyDefault: boolean;
  deviationThresholds: { monitoring: number; caution: number; highRisk: number; critical: number };
  graceSeconds: number;
  arrivalTimeoutSeconds: number;
  notifyOnCaution: boolean;
  shareLiveLocation: boolean;
  reducedMotion: boolean;
};

export type SafetyCheck = {
  id: string;
  reason: "deviation" | "arrival";
  message: string;
  openedAt: number;
  level: SafetyLevel;
};
