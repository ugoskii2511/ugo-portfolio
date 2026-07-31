import Link from "next/link";
import { Compass, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] items-center py-20">
      <Container className="max-w-2xl text-center">
        <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
          <Compass className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-6 font-serif text-6xl font-bold text-primary">404</p>
        <h1 className="mt-3 font-serif text-2xl font-bold sm:text-3xl">
          This page took a wrong turn
        </h1>
        <p className="mt-3 text-foreground/70">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90"
          >
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-6 py-3 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" />
            Contact Me
          </Link>
        </div>
      </Container>
    </div>
  );
}
