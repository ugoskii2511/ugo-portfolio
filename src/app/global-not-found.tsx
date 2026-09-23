import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Page not found — Ugochukwu.dev",
  description: "The page you are looking for does not exist.",
  robots: { index: false },
};

// This is the app-wide fallback for any URL that doesn't match a route in
// either root layout ((marketing) or (dashboard)) — see next.config.ts's
// `experimental.globalNotFound` flag. Route-group `not-found.tsx` files
// handle in-app `notFound()` calls with full Navbar/Footer chrome; this
// file bypasses all layouts, so it renders a standalone branded page.
export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="site relative isolate flex min-h-full items-center p-6">
        <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
        <main className="mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-12">
          <Link href="/" className="label-mono inline-flex min-h-11 items-center hover:text-fg">
            Ugochukwu.dev
          </Link>
          <p className="label-mono mt-10">Error 404</p>
          <h1 className="display mt-6 max-w-3xl text-balance text-5xl sm:text-7xl">
            This page doesn&apos;t exist. <span className="text-muted">Yet.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">It may have moved, or the link might be mistyped.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-[#4f79ff]"
            >
              Back home
            </Link>
            <Link
              href="/work"
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-6 py-3 text-sm font-medium text-fg transition hover:bg-white/5"
            >
              See the work
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
