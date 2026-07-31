"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/container";

export default function MarketingError({
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
    <div className="flex min-h-[65vh] items-center py-20">
      <Container className="max-w-2xl text-center">
        <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
          <AlertTriangle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 font-serif text-2xl font-bold sm:text-3xl">Something went wrong</h1>
        <p className="mt-3 text-foreground/70">
          An unexpected error occurred loading this page. You can try again, or head back home.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-6 py-3 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
          >
            Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
}
