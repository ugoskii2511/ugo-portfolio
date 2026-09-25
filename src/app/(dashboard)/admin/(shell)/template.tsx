/// Re-mounts per navigation: a short CSS fade so page changes feel
/// continuous without delaying them.
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
