export type AnalyticsEventType = "PAGE_VIEW" | "BOOKING_CLICK";

export function trackEvent(type: AnalyticsEventType, path?: string) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, path }),
    keepalive: true,
  }).catch(() => {
    // Analytics is best-effort; a failed ping should never affect the UI.
  });
}
