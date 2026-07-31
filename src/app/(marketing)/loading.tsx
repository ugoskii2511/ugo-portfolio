export default function MarketingLoading() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center py-20">
      <div className="glass-panel flex h-16 w-16 items-center justify-center rounded-2xl">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    </div>
  );
}
