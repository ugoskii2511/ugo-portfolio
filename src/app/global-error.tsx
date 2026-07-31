"use client";

import { useEffect } from "react";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  style: ["normal", "italic"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full items-center justify-center bg-background p-6 text-foreground">
        <title>Something went wrong</title>
        <div className="glass-panel w-full max-w-md rounded-2xl p-10 text-center">
          <h1 className="font-serif text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-foreground/70">
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
