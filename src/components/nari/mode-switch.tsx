import { useNavigate } from "@tanstack/react-router";
import { Car, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/nari/auth";
import { usePartner } from "@/lib/nari/partner-store";
import { cn } from "@/lib/utils";

/**
 * inDrive-style single-account mode switch: the same signed-in user can ride or drive.
 * Switching to driver mode sends unverified accounts through partner onboarding first.
 */
export function ModeSwitch({ className }: { className?: string }) {
  const { mode, setMode, session } = useAuth();
  const { state: partner } = usePartner();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const go = async (next: "passenger" | "driver") => {
    if (next === mode || busy) return;
    setBusy(true);
    await setMode(next);
    setBusy(false);
    if (next === "driver") {
      if (partner.profile?.verification === "APPROVED") {
        toast.success("Driver mode on");
        void navigate({ to: "/partner/dashboard" });
      } else {
        toast.info("Complete driver verification to start earning");
        void navigate({ to: "/partner/onboarding" });
      }
    } else {
      toast.success("Passenger mode on");
      void navigate({ to: "/" });
    }
  };

  return (
    <div
      role="tablist"
      aria-label="App mode"
      className={cn("glass grid grid-cols-2 gap-1 rounded-full p-1", className)}
    >
      {(
        [
          { key: "passenger" as const, label: "Ride", icon: UserRound },
          { key: "driver" as const, label: "Drive", icon: Car },
        ]
      ).map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={mode === opt.key}
          onClick={() => void go(opt.key)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
            mode === opt.key ? "bg-brand-gradient text-primary-foreground" : "text-muted-foreground",
          )}
        >
          <opt.icon className="size-3.5" aria-hidden="true" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
