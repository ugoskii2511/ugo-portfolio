export default function MarketingLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-bright" />
        <span className="label-mono">Loading</span>
      </div>
    </div>
  );
}
