import Link from "next/link";
import { Compass } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
          <Compass className="h-5 w-5" />
        </div>
        <p className="mt-5 text-3xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-foreground/60">
          This admin page doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
