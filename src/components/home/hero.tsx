"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useBookingModal } from "@/components/booking-modal";
import { serviceCategories } from "@/lib/services-data";

export type HeroStats = {
  projectsDelivered: number;
  clientReviews: number;
  serviceCategories: number;
};

export function Hero({
  stats,
  averageRating,
  availabilityStatus,
  heroIntro,
}: {
  stats: HeroStats;
  averageRating: number | null;
  availabilityStatus: string;
  heroIntro: string;
}) {
  const { openBooking } = useBookingModal();
  const tickerItems = [...serviceCategories, ...serviceCategories];

  return (
    <section className="relative overflow-hidden pb-16 pt-20 sm:pt-28">
      <div className="hero-glow" />
      <div className="grid-texture absolute inset-x-0 top-0 h-[36rem] -z-10" />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
        <div className="flex flex-col items-start text-left">
          <span
            className="reveal-up glass-panel inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {availabilityStatus}
            <span className="text-foreground/40">&middot;</span>
            Full-Stack Web Developer
          </span>

          <h1
            className="reveal-up mt-6 font-serif text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
            style={{ animationDelay: "150ms" }}
          >
            Building fast, modern{" "}
            <span className="italic text-primary">web experiences</span> that work.
          </h1>

          <p
            className="reveal-up mt-6 max-w-xl text-lg text-foreground/70"
            style={{ animationDelay: "300ms" }}
          >
            {heroIntro}
          </p>

          <div
            className="reveal-up mt-8 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "450ms" }}
          >
            <motion.button
              type="button"
              onClick={() => openBooking("General Inquiry")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl hover:shadow-primary/50"
            >
              <MessageCircle className="h-4 w-4" />
              Start a Project
            </motion.button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/portfolio"
                className="group inline-flex items-center gap-2 rounded-full border border-border-subtle px-6 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                View My Work
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

          <div
            className="reveal-up mt-12 flex items-center gap-6 sm:gap-10"
            style={{ animationDelay: "600ms" }}
          >
            {[
              { value: `${stats.projectsDelivered}+`, label: "Projects Delivered" },
              { value: `${stats.clientReviews}+`, label: "Client Reviews" },
              { value: `${stats.serviceCategories}`, label: "Service Categories" },
            ].map((stat, index) => (
              <div key={stat.label} className={index > 0 ? "border-l border-border-subtle pl-6 sm:pl-10" : ""}>
                <p className="font-serif text-2xl font-bold text-primary sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-foreground/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="reveal-up relative mx-auto w-full max-w-sm lg:mx-0" style={{ animationDelay: "250ms" }}>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <div className="absolute inset-0 -z-10 rounded-full border border-primary/10" />
            <div className="glass-panel rounded-3xl p-6 transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/20">
              <span className="glass-panel inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                {stats.projectsDelivered}+ Projects Done
              </span>

              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-lg font-bold text-white"
                >
                  UC
                </motion.div>
                <h3 className="font-serif text-lg font-bold">Full-Stack Delivery, End to End</h3>
                {averageRating !== null ? (
                  <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {averageRating.toFixed(1)} Average Rating
                  </div>
                ) : (
                  <p className="text-sm text-foreground/60">Frontend, backend &amp; everything between</p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Available for new projects
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mt-16 overflow-hidden border-y border-border-subtle py-4">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-sm uppercase tracking-wide text-foreground/40">
          {tickerItems.map((category, index) => (
            <span key={`${category.id}-${index}`} className="flex items-center gap-10">
              {category.title}
              <span className="text-primary">&#10022;</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
