"use client";

import { Mail, MessageCircle, PenLine } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { useBookingModal } from "@/components/booking-modal";
import { buildBookingWhatsAppUrl } from "@/lib/whatsapp";

export function ContactContent({
  contactEmail,
  whatsappNumber,
}: {
  contactEmail: string;
  whatsappNumber: string;
}) {
  const { openBooking } = useBookingModal();

  const whatsappUrl = buildBookingWhatsAppUrl(
    {
      name: "there",
      projectType: "a project",
      budget: "TBD",
      details: "I'd like to know more about your services.",
    },
    whatsappNumber
  );

  return (
    <div className="py-20">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="Contact"
          title={
            <>
              Let&apos;s build something <span className="italic text-primary">together</span>
            </>
          }
          description="The fastest way to reach me is WhatsApp — I usually reply the same day."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition hover:-translate-y-1"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">WhatsApp</h3>
              <p className="mt-1 text-sm text-foreground/70">Chat directly, right now</p>
            </div>
          </a>

          <a
            href={`mailto:${contactEmail}`}
            className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition hover:-translate-y-1"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Email</h3>
              <p className="mt-1 text-sm text-foreground/70 break-all">{contactEmail}</p>
            </div>
          </a>

          <button
            type="button"
            onClick={() => openBooking("General Inquiry")}
            className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition hover:-translate-y-1"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Project Form</h3>
              <p className="mt-1 text-sm text-foreground/70">Share your project details</p>
            </div>
          </button>
        </div>
      </Container>
    </div>
  );
}
