export const NARI_MARK_URL = "/favicon.png";
export const NARI_LOGO_URL = "/favicon.png";

export function NariLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/favicon.png"
      width={size}
      height={size}
      alt="NariRide logo"
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Full lockup with emblem + wordmark artwork. */
export function NariLockup({ width = 260, className = "" }: { width?: number; className?: string }) {
  // Use the wordmark as a fallback since the full logo asset URL is unavailable locally
  return <NariWordmark className={className} />;
}

export function NariWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <NariLogo size={30} />
      <span className="text-lg font-semibold tracking-tight">
        <span className="text-brand-gradient">Nari</span>
        <span className="text-foreground">Ride</span>
      </span>
    </span>
  );
}
