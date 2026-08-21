import { ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * SOS control with a 3-second countdown so it cannot be triggered by an accidental tap.
 */
export function SosButton({
  onActivate,
  className,
  compact = false,
}: {
  onActivate: () => void;
  className?: string;
  compact?: boolean;
}) {
  const [counting, setCounting] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!counting) return;
    setRemaining(3);
    let left = 3;
    timer.current = window.setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        if (timer.current) window.clearInterval(timer.current);
        setCounting(false);
        onActivate();
      }
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [counting, onActivate]);

  if (counting) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          type="button"
          onClick={() => onActivate()}
          className="pulse-critical flex-1 rounded-2xl bg-critical px-4 py-4 text-base font-bold text-critical-foreground"
        >
          Sending SOS in {remaining}s — tap to send now
        </button>
        <button
          type="button"
          onClick={() => setCounting(false)}
          className="rounded-2xl border border-border px-4 py-4 text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setCounting(true)}
      aria-label="Activate SOS emergency workflow"
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl bg-critical font-bold text-critical-foreground transition-transform active:scale-[0.97]",
        compact ? "px-4 py-3 text-sm" : "w-full px-6 py-5 text-lg",
        className,
      )}
    >
      <ShieldAlert className={compact ? "size-4" : "size-6"} aria-hidden="true" />
      SOS
    </button>
  );
}
