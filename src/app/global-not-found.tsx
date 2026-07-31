import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Not Found",
  description: "The page you are looking for does not exist.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full items-center justify-center bg-background p-6 text-foreground">
        <div className="glass-panel w-full max-w-md rounded-2xl p-10 text-center">
          <p className="font-serif text-6xl font-bold text-primary">404</p>
          <h1 className="mt-3 font-serif text-2xl font-bold">Page not found</h1>
          <p className="mt-3 text-foreground/70">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90"
          >
            Back to Home
          </Link>
        </div>
      </body>
    </html>
  );
}
