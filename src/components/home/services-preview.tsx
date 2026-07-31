"use client";

import Link from "next/link";
import {
  Code2,
  Database,
  LayoutDashboard,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { useBookingModal } from "@/components/booking-modal";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const HIGHLIGHTS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Code2,
    title: "Frontend Development",
    description: "React, Next.js, Vue & Tailwind CSS interfaces.",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce Solutions",
    description: "Paystack, Flutterwave & Stripe powered stores.",
  },
  {
    icon: LayoutDashboard,
    title: "SaaS & Dashboards",
    description: "Custom platforms, auth systems, EdTech & VTU portals.",
  },
  {
    icon: Database,
    title: "Database & APIs",
    description: "PostgreSQL, MongoDB, Supabase, REST & GraphQL.",
  },
];

export function ServicesPreview() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="What I Do"
          title={
            <>
              Everything your project <span className="italic text-primary">needs</span>
            </>
          }
          description="From pixel-perfect frontends to secure, scalable backends — one developer, full coverage."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item, index) => (
            <HighlightCard key={item.title} item={item} index={index} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/services"
            className="group text-sm font-semibold text-primary transition hover:text-primary-dark"
          >
            See all services{" "}
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </Container>
    </section>
  );
}

function HighlightCard({
  item,
  index,
}: {
  item: (typeof HIGHLIGHTS)[number];
  index: number;
}) {
  const { openBooking } = useBookingModal();
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal delay={index * 60}>
      <button
        type="button"
        onClick={() => openBooking(item.title)}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="glass-panel group relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl p-6 text-left transition-transform duration-300 hover:-translate-y-1.5"
      >
        <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
        <span className="absolute right-5 top-5 font-serif text-xl font-bold text-primary/20 transition-colors duration-300 group-hover:text-primary/50">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          <item.icon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold">{item.title}</h3>
        <p className="text-sm text-foreground/70">{item.description}</p>
      </button>
    </Reveal>
  );
}
