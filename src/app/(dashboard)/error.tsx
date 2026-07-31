"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-foreground/60">
          An unexpected error occurred loading this page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-5 py-2.5 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
