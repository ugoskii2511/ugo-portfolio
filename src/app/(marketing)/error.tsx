"use client";

import { useEffect } from "react";
import { Wrap } from "@/components/site/wrap";
import { LinkButton, buttonClass } from "@/components/site/button";

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
    <section className="flex min-h-[70vh] items-center py-24">
      <Wrap>
        <p className="label-mono">Something broke</p>
        <h1 className="display mt-6 max-w-3xl text-balance text-5xl sm:text-6xl">
          This page failed to load.
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          It&apos;s probably a temporary hiccup. Try again, or head back home.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={() => unstable_retry()} className={buttonClass("primary")}>
            Try again
          </button>
          <LinkButton href="/" variant="secondary">
            Back home
          </LinkButton>
        </div>
      </Wrap>
    </section>
  );
}
