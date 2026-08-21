import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, FileText, IdCard, ShieldCheck, Car } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { NariWordmark } from "@/components/nari/logo";
import { GlassCard } from "@/components/nari/ui-kit";
import { usePartner, type PartnerDocKey } from "@/lib/nari/partner-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partner/onboarding")({
  head: () => ({
    meta: [
      { title: "Partner onboarding — NariRide" },
      {
        name: "description",
        content: "Register as a NariRide rider partner: personal details, vehicle details and document verification.",
      },
      { property: "og:title", content: "Partner onboarding — NariRide" },
      { property: "og:description", content: "Three quick steps: profile, vehicle, documents. Verification is instant in this prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnerOnboarding,
});

const DOCS: { key: PartnerDocKey; label: string; detail: string }[] = [
  { key: "aadhaar", label: "Identity proof (Aadhaar)", detail: "Name and address verification" },
  { key: "license", label: "Driving licence", detail: "Valid commercial licence" },
  { key: "rc", label: "Vehicle RC", detail: "Registration certificate" },
  { key: "police", label: "Police clearance", detail: "Mandatory for women-first rides" },
  { key: "selfie", label: "Live selfie", detail: "Matched with your identity proof" },
];

const VEHICLES = ["Bike", "Auto", "Hatchback", "Sedan", "SUV"];

const inputClass =
  "w-full rounded-xl border border-border bg-secondary/40 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary";

function PartnerOnboarding() {
  const { state, saveProfile, submitForReview } = usePartner();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: state.profile?.name ?? "",
    phone: state.profile?.phone ?? "",
    city: state.profile?.city ?? "Kolkata",
    gender: (state.profile?.gender ?? "female") as "female" | "male" | "other",
    vehicleType: state.profile?.vehicleType ?? "Sedan",
    vehicleModel: state.profile?.vehicleModel ?? "",
    vehicleNumber: state.profile?.vehicleNumber ?? "",
    licenceNumber: state.profile?.licenceNumber ?? "",
    womenOnlyPreference: state.profile?.womenOnlyPreference ?? true,
  });
  const [docs, setDocs] = useState<Record<PartnerDocKey, boolean>>(
    state.profile?.docs ?? { aadhaar: false, license: false, rc: false, police: false, selfie: false },
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stepValid =
    step === 0
      ? form.name.trim().length > 1 && /^\d{10}$/.test(form.phone.replace(/\D/g, ""))
      : step === 1
        ? form.vehicleModel.trim().length > 1 &&
          form.vehicleNumber.trim().length > 3 &&
          form.licenceNumber.trim().length > 3
        : DOCS.every((d) => docs[d.key]);

  const submit = () => {
    saveProfile({ ...form, docs });
    submitForReview();
    toast.success("Application submitted", { description: "Verification runs automatically in this prototype." });
    void navigate({ to: "/partner/dashboard" });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 pb-10 pt-6 safe-top safe-bottom">
      <div className="flex items-center justify-between">
        <NariWordmark />
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Partner</span>
      </div>

      <div className="flex items-center gap-2">
        {["Profile", "Vehicle", "Documents"].map((label, i) => (
          <div key={label} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-brand-gradient" : "bg-muted")} />
            <p className={cn("mt-1 text-[10px] font-semibold", i <= step ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <GlassCard className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <IdCard className="size-4 text-accent" aria-hidden="true" /> Your details
          </p>
          <input className={inputClass} placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          <input
            className={inputClass}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <input className={inputClass} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {(["female", "male", "other"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set("gender", g)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-xs font-semibold capitalize",
                  form.gender === g ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-xs">
            <span>Prefer women passengers only</span>
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={form.womenOnlyPreference}
              onChange={(e) => set("womenOnlyPreference", e.target.checked)}
            />
          </label>
        </GlassCard>
      ) : null}

      {step === 1 ? (
        <GlassCard className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Car className="size-4 text-accent" aria-hidden="true" /> Vehicle & licence
          </p>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set("vehicleType", v)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-xs font-semibold",
                  form.vehicleType === v ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            className={inputClass}
            placeholder="Vehicle model (e.g. Maruti Dzire)"
            value={form.vehicleModel}
            onChange={(e) => set("vehicleModel", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Vehicle number (WB-00-XX-0000)"
            value={form.vehicleNumber}
            onChange={(e) => set("vehicleNumber", e.target.value.toUpperCase())}
          />
          <input
            className={inputClass}
            placeholder="Driving licence number"
            value={form.licenceNumber}
            onChange={(e) => set("licenceNumber", e.target.value.toUpperCase())}
          />
        </GlassCard>
      ) : null}

      {step === 2 ? (
        <GlassCard className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-accent" aria-hidden="true" /> Documents
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Tap each document to mark it uploaded. Files are never transmitted in this prototype — verification is
            simulated on-device.
          </p>
          {DOCS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDocs((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left",
                docs[d.key] ? "border-safe/50 bg-safe/10" : "border-border bg-secondary/40",
              )}
            >
              <span>
                <span className="block text-sm font-semibold">{d.label}</span>
                <span className="block text-[11px] text-muted-foreground">{d.detail}</span>
              </span>
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border",
                  docs[d.key] ? "border-safe bg-safe/20 text-safe" : "border-border text-muted-foreground",
                )}
              >
                {docs[d.key] ? <Check className="size-3.5" aria-hidden="true" /> : null}
              </span>
            </button>
          ))}
        </GlassCard>
      ) : null}

      <div className="mt-auto space-y-2">
        <button
          type="button"
          disabled={!stepValid}
          onClick={() => {
            if (step < 2) setStep((s) => s + 1);
            else submit();
          }}
          className="w-full rounded-2xl bg-brand-gradient px-4 py-4 text-base font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
        >
          {step < 2 ? "Continue" : "Submit for verification"}
        </button>
        <button
          type="button"
          onClick={() => (step === 0 ? void navigate({ to: "/partner" }) : setStep((s) => s - 1))}
          className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
        >
          Back
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" /> Police clearance is mandatory for
          women-first rides.
        </p>
      </div>
    </div>
  );
}
