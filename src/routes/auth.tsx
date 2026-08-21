import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Car, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { NariLogo } from "@/components/nari/logo";
import { GlassCard } from "@/components/nari/ui-kit";
import { useAuth, type AppMode } from "@/lib/nari/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to NariRide" },
      {
        name: "description",
        content:
          "Create a NariRide account as a passenger or a driver partner and access live monitored rides, trusted contacts and SOS.",
      },
      { property: "og:title", content: "Sign in to NariRide" },
      { property: "og:description", content: "One account, two modes: ride safely or drive and earn." },
    ],
  }),
  component: AuthScreen,
});

const inputClass =
  "w-full rounded-xl border border-input bg-secondary/40 px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-accent";

function AuthScreen() {
  const { ready, session, signIn, signUp, signInWithGoogle, mode: currentMode } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [accountMode, setAccountMode] = useState<AppMode>("passenger");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  type FieldKey = "name" | "email" | "phone" | "password";
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    void navigate({ to: currentMode === "driver" ? "/partner/dashboard" : "/" });
  }, [ready, session, currentMode, navigate]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (mode === "register") {
      if (form.name.trim().length < 2) next.name = "Enter your name.";
      if (!/^[+\d][\d\s-]{7,15}$/.test(form.phone.trim())) next.phone = "Enter a valid phone number.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.password.length < 6) next.password = "Use at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === "register") {
        const error = await signUp({ ...form, mode: accountMode });
        if (error) {
          toast.error(error);
          setErrors({ password: error });
        } else {
          toast.success("Account created");
          void navigate({ to: accountMode === "driver" ? "/partner/onboarding" : "/" });
        }
      } else {
        const error = await signIn(form.email, form.password);
        if (error) setErrors({ password: error });
        else toast.success("Welcome back");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const error = await signInWithGoogle();
    setBusy(false);
    if (error) toast.error(error);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-10 safe-top safe-bottom">
      <div className="space-y-2">
        <NariLogo size={44} className="text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "register" ? "Create your NariRide account" : "Welcome back to NariRide"}
        </h1>
        <p className="text-xs text-muted-foreground">
          One account works in both modes — book safe rides as a passenger, or go online and earn as a driver partner.
        </p>
      </div>

      <div className="glass grid grid-cols-2 gap-1 rounded-2xl p-1">
        {(["register", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-xl py-2.5 text-sm font-semibold transition-colors",
              mode === m ? "bg-brand-gradient text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {m === "register" ? "Register" : "Sign in"}
          </button>
        ))}
      </div>

      <GlassCard>
        <form className="space-y-3" onSubmit={submit} noValidate>
          {mode === "register" ? (
            <>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  I want to
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "passenger" as const, label: "Book rides", icon: UserRound },
                      { key: "driver" as const, label: "Drive & earn", icon: Car },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAccountMode(opt.key)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold",
                        accountMode === opt.key
                          ? "border-transparent bg-brand-gradient text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      <opt.icon className="size-4" aria-hidden="true" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Full name" error={errors.name}>
                <input className={inputClass} value={form.name} onChange={set("name")} placeholder="Priya Sen" autoComplete="name" />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input className={inputClass} value={form.phone} onChange={set("phone")} placeholder="+91 90000 00000" inputMode="tel" autoComplete="tel" />
              </Field>
            </>
          ) : null}
          <Field label="Email" error={errors.email}>
            <input className={inputClass} value={form.email} onChange={set("email")} placeholder="you@example.com" inputMode="email" autoComplete="email" />
          </Field>
          <Field label="Password" error={errors.password}>
            <input
              className={inputClass}
              value={form.password}
              onChange={set("password")}
              type="password"
              placeholder="At least 6 characters"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand-gradient px-4 py-4 text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => void google()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3.5 text-sm font-semibold disabled:opacity-60"
        >
          <GoogleMark /> Continue with Google
        </button>
      </GlassCard>

      <p className="text-center text-[11px] text-muted-foreground">
        Your account, rides and emergency contacts are stored securely in the NariRide cloud.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="block text-[11px] text-critical">{error}</span> : null}
    </label>
  );
}
