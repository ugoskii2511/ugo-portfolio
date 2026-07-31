"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useBookingModal } from "@/components/booking-modal";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";
import { Container } from "@/components/ui/container";

export function CtaBanner() {
  const { openBooking } = useBookingModal();
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <section className="py-20">
      <Container>
        <Reveal
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className="glass-panel relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl px-6 py-14 text-center"
        >
          <div className="grid-texture absolute inset-0 -z-10" />
          <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">
            Ready to build <span className="italic text-primary">something great</span>?
          </h2>
          <p className="max-w-xl text-foreground/70">
            Tell me about your project and I&apos;ll reply on WhatsApp — usually within the
            same day.
          </p>
          <motion.button
            type="button"
            onClick={() => openBooking("General Inquiry")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl hover:shadow-primary/50"
          >
            <MessageCircle className="h-4 w-4" />
            Get in Touch
          </motion.button>
        </Reveal>
      </Container>
    </section>
  );
}
