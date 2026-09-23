/// Re-mounts on every navigation, so each page gets a short fade-in. Plain
/// CSS (no exit animation) keeps navigation instant.
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
