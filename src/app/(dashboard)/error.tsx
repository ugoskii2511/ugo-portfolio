"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/site/button";

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
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="edge relative w-full max-w-md rounded-[1.4rem] p-8">
        <p className="label-mono">Something broke</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page failed to load</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Usually a temporary database or network hiccup. Nothing was changed.
          {error.digest && <span className="mt-2 block font-mono text-xs text-faint">Ref: {error.digest}</span>}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => unstable_retry()} className={buttonClass("primary", "sm")}>
            Try again
          </button>
          <Link href="/admin" className={buttonClass("secondary", "sm")}>
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
