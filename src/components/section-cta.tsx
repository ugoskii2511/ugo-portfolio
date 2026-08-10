"use client";

import { MessageCircle } from "lucide-react";
import { useBookingModal } from "@/components/booking-modal";
import { Reveal } from "@/components/reveal";

export function SectionCta({
  label,
  buttonLabel = "Let's Talk",
  serviceName = "General Inquiry",
}: {
  label: string;
  buttonLabel?: string;
  serviceName?: string;
}) {
  const { openBooking } = useBookingModal();

  return (
    <Reveal className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-subtle p-5 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="text-sm text-foreground/70">{label}</p>
      <button
        type="button"
        onClick={() => openBooking(serviceName)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/40"
      >
        <MessageCircle className="h-4 w-4" />
        {buttonLabel}
      </button>
    </Reveal>
  );
}
