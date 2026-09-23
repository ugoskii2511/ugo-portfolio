"use client";

import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Catches errors thrown by the root layouts themselves (both (marketing)
// and (dashboard) define their own root layout, so a crash there wouldn't
// be caught by either route group's error.tsx). Must define its own
// <html>/<body> and re-import globals.css since it replaces the root
// layout entirely when active.
export default function GlobalError({
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="site flex min-h-full items-center p-6">
        <title>Something went wrong</title>
        <main className="mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-12">
          <p className="label-mono">Something broke</p>
          <h1 className="display mt-6 max-w-3xl text-balance text-5xl sm:text-6xl">
            The site hit an unexpected error.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            It&apos;s usually temporary. Give it another try in a moment.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-[#4f79ff]"
            >
              Try again
            </button>
            {/* Plain anchor on purpose: a full reload re-runs the root layout. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-6 py-3 text-sm font-medium text-fg transition hover:bg-white/5"
            >
              Back home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
