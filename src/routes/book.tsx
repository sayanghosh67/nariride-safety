import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Crosshair, IndianRupee, MapPin, Shield, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { NariMap } from "@/components/nari/map-view";
import { ErrorState, GlassCard, SectionTitle } from "@/components/nari/ui-kit";
import { PLACES, RIDE_TYPES, isNightNow } from "@/lib/nari/data";
import { fareFor, PAYMENT_METHODS, VEHICLE_CLASSES, vehicleClass, type PaymentMethod } from "@/lib/nari/fares";
import { buildRoute, routeLength } from "@/lib/nari/geo";
import { locationService } from "@/lib/nari/location-service";
import { useNari } from "@/lib/nari/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a monitored ride — NariRide" },
      {
        name: "description",
        content: "Set pickup and destination, preview the expected route and start a ride with live safety monitoring.",
      },
      { property: "og:title", content: "Book a monitored ride — NariRide" },
      { property: "og:description", content: "Route preview, ride PIN, trusted journey sharing and live monitoring." },
    ],
  }),
  component: () => (
    <Gate>
      <BookRide />
    </Gate>
  ),
});

function BookRide() {
  const { state, bookRide, activeRide } = useNari();
  const navigate = useNavigate();
  const [pickupIndex, setPickupIndex] = useState(0);
  const [destIndex, setDestIndex] = useState(1);
  const [rideType, setRideType] = useState(isNightNow(state.settings) ? "night" : "solo");
  const [usePin, setUsePin] = useState(true);
  const [trusted, setTrusted] = useState(state.settings.trustedJourneyDefault);
  const [vehicle, setVehicle] = useState<string>("auto");
  const [payment, setPayment] = useState<PaymentMethod>("CASH");
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const pickup = PLACES[pickupIndex]!;
  const destination = PLACES[destIndex]!;
  const invalid = pickupIndex === destIndex;

  const preview = useMemo(() => {
    if (invalid) return null;
    const route = buildRoute(pickup, destination, 11);
    const km = routeLength(route) / 1000;
    return { route, km, eta: Math.max(6, Math.round((km / 22) * 60)) };
  }, [pickup, destination, invalid]);

  const night = isNightNow(state.settings);
  const quote = useMemo(() => fareFor(vehicle, preview?.km ?? 0, night), [vehicle, preview?.km, night]);

  const useMyLocation = async () => {
    setLocating(true);
    const { point, error } = await locationService.getCurrent();
    setLocating(false);
    if (error || !point) {
      setGpsNote(error?.message ?? "Could not read your location.");
      return;
    }
    let best = 0;
    let bestD = Infinity;
    PLACES.forEach((p, i) => {
      const d = (p.lat - point.lat) ** 2 + (p.lng - point.lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setPickupIndex(best);
    setGpsNote(`Nearest saved place selected: ${PLACES[best]!.label}.`);
  };

  if (activeRide) {
    return (
      <AppShell title="Ride in progress" subtitle="Finish or cancel your current ride first">
        <GlassCard className="space-y-3">
          <p className="text-sm">
            You already have an active ride to <strong>{activeRide.destination.label}</strong>.
          </p>
          <button
            type="button"
            onClick={() => void navigate({ to: "/ride" })}
            className="w-full rounded-2xl bg-brand-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground"
          >
            Open live ride
          </button>
        </GlassCard>
      </AppShell>
    );
  }

  return (
    <AppShell title="Book a ride" subtitle="Every journey is monitored end to end">
      <div className="space-y-4">
        <GlassCard className="space-y-3">
          <Selector
            label="Pickup"
            icon={<MapPin className="size-4 text-safe" aria-hidden="true" />}
            value={pickupIndex}
            onChange={setPickupIndex}
          />
          <Selector
            label="Destination"
            icon={<MapPin className="size-4 text-primary" aria-hidden="true" />}
            value={destIndex}
            onChange={setDestIndex}
          />
          <button
            type="button"
            onClick={() => void useMyLocation()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-xs font-semibold text-accent"
          >
            <Crosshair className="size-4" aria-hidden="true" />
            {locating ? "Reading GPS…" : "Use my current location for pickup"}
          </button>
          {gpsNote ? <p className="text-[11px] text-muted-foreground">{gpsNote}</p> : null}
        </GlassCard>

        {invalid ? (
          <ErrorState title="Pickup and destination match" detail="Choose two different places to preview a route." />
        ) : (
          <>
            <div>
              <SectionTitle title="Route preview" />
              <GlassCard className="space-y-3 p-0">
                <NariMap
                  className="h-56 w-full rounded-t-2xl"
                  route={preview!.route}
                  pickup={{ ...pickup }}
                  destination={{ ...destination }}
                />
                <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center">
                  <Stat label="Distance" value={`${preview!.km.toFixed(1)} km`} />
                  <Stat label="ETA" value={`${preview!.eta} min`} />
                  <Stat label="Night mode" value={isNightNow(state.settings) ? "On" : "Off"} />
                </div>
              </GlassCard>
            </div>

            <div>
              <SectionTitle title="Choose your ride" />
              <div className="space-y-2">
                {VEHICLE_CLASSES.map((v) => {
                  const q = fareFor(v.id, preview!.km, night);
                  const selected = vehicle === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicle(v.id)}
                      className={cn(
                        "glass flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left",
                        selected && "border-accent/60",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{v.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{v.detail}</span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                          {v.seats} seat{v.seats > 1 ? "s" : ""} · {q.etaMinutes} min · ₹{v.perKm}/km
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-base font-bold tabular-nums">₹{q.total}</span>
                        <span
                          className={cn(
                            "mt-1 inline-block size-3.5 rounded-full border",
                            selected ? "border-accent bg-accent" : "border-border",
                          )}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionTitle title="Fare breakdown" />
              <GlassCard className="space-y-1.5 text-xs">
                <Row label={`${vehicleClass(vehicle).label} base fare`} value={`₹${quote.base}`} />
                <Row label={`Distance ${quote.km.toFixed(1)} km × ₹${quote.perKm}`} value={`₹${quote.distance}`} />
                {quote.nightFee ? <Row label="Night escort premium" value={`₹${quote.nightFee}`} /> : null}
                <Row label="Safety & monitoring fee" value={`₹${quote.safetyFee}`} />
                <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold">
                  <span>Total payable</span>
                  <span className="tabular-nums">₹{quote.total}</span>
                </div>
              </GlassCard>
            </div>

            <div>
              <SectionTitle title="Payment method" />
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayment(m.id)}
                    className={cn(
                      "glass rounded-2xl px-3 py-3 text-left",
                      payment === m.id && "border-accent/60",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {m.id === "CASH" ? (
                        <Wallet className="size-4 text-accent" aria-hidden="true" />
                      ) : (
                        <IndianRupee className="size-4 text-accent" aria-hidden="true" />
                      )}
                      {m.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{m.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle title="Ride type" />
              <div className="space-y-2">
                {RIDE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRideType(t.id)}
                    className={cn(
                      "glass flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left",
                      rideType === t.id && "border-accent/60",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{t.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{t.detail}</span>
                    </span>
                    <span
                      className={cn(
                        "size-4 rounded-full border",
                        rideType === t.id ? "border-accent bg-accent" : "border-border",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>

            <GlassCard className="space-y-3">
              <ToggleRow
                icon={<Shield className="size-4 text-accent" aria-hidden="true" />}
                label="Generate ride PIN"
                detail="Share a 4-digit PIN with your driver before boarding"
                value={usePin}
                onChange={setUsePin}
              />
              <ToggleRow
                icon={<Users className="size-4 text-accent" aria-hidden="true" />}
                label="Trusted journey"
                detail={`Share live status with ${state.contacts.length} trusted contact(s) — simulated`}
                value={trusted}
                onChange={setTrusted}
              />
            </GlassCard>

            <button
              type="button"
              onClick={() => {
                const ride = bookRide({
                  pickup: { label: pickup.label, lat: pickup.lat, lng: pickup.lng },
                  destination: { label: destination.label, lat: destination.lat, lng: destination.lng },
                  rideType,
                  vehicleClass: vehicle,
                  paymentMethod: payment,
                  trustedJourney: trusted,
                  usePin,
                });
                toast.success(`${vehicleClass(vehicle).label} booked · ₹${ride.fare}`, {
                  description: "Finding a verified woman captain near you",
                });
                void navigate({ to: "/ride" });
              }}
              className="w-full rounded-2xl bg-brand-gradient px-4 py-4 text-base font-bold text-primary-foreground active:scale-[0.98]"
            >
              Confirm {vehicleClass(vehicle).label} · ₹{quote.total}
            </button>

          </>
        )}
      </div>
    </AppShell>
  );
}

function Selector({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-input bg-secondary/60 px-3.5 py-3 text-sm outline-none focus:border-accent"
      >
        {PLACES.map((p, i) => (
          <option key={p.label} value={i}>
            {p.label} · {p.tag}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

export function ToggleRow({
  icon,
  label,
  detail,
  value,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          {icon} {label}
        </p>
        {detail ? <p className="text-[11px] leading-snug text-muted-foreground">{detail}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          value ? "border-accent/60 bg-accent/70" : "border-border bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-foreground transition-all",
            value ? "left-6" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
