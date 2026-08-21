import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, MapPinCheck } from "lucide-react";

import { StatusPill } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";

export function SafetyCheckSheet() {
  const { state, activeRide, respondSafetyCheck, completeRide } = useNari();
  const navigate = useNavigate();
  const check = state.safetyCheck;
  if (!check || !activeRide) return null;

  const arrival = check.reason === "arrival";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="glass-strong w-full rounded-t-3xl p-5 safe-bottom">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center gap-2">
            {arrival ? (
              <MapPinCheck className="size-5 text-safe" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-5 text-risk" aria-hidden="true" />
            )}
            <StatusPill level={check.level} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{check.message}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {arrival
                ? "Confirm your safe arrival to close this journey."
                : activeRide.risk?.explanation}
            </p>
          </div>
          <p className="text-lg font-semibold">Are you safe?</p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                respondSafetyCheck(true);
                if (arrival) {
                  completeRide();
                  void navigate({ to: "/arrival" });
                }
              }}
              className="rounded-2xl bg-safe px-4 py-4 text-base font-bold text-safe-foreground active:scale-[0.98]"
            >
              I'm safe
            </button>
            <button
              type="button"
              onClick={() => {
                respondSafetyCheck(false);
                void navigate({ to: "/sos" });
              }}
              className="rounded-2xl bg-critical px-4 py-4 text-base font-bold text-critical-foreground active:scale-[0.98]"
            >
              Need help / SOS
            </button>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            NariRide never contacts authorities without your authorisation. Emergency delivery is simulated in this
            prototype.
          </p>
        </div>
      </div>
    </div>
  );
}
