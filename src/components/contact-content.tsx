"use client";

import { ArrowUpRight, Mail, PenLine } from "lucide-react";
import { FaSnapchat, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import type { ReactNode } from "react";
import { Wrap } from "@/components/site/wrap";
import { ServicesGuarantees } from "@/components/services-guarantees";
import { useBookingModal } from "@/components/booking-modal";
import { buildBookingWhatsAppUrl, formatWhatsAppDisplay } from "@/lib/whatsapp";

const NEXT_STEPS = [
  ["You share the idea", "A few lines is enough: what you want to build, and roughly when."],
  ["I reply, usually the same day", "With questions, a first take on approach, and whether it's a fit."],
  ["Scope and a fixed quote", "Clear deliverables, timeline and price before any work begins."],
  ["We build", "Regular progress updates, from first commit to launch."],
];

function ChannelRow({
  icon,
  title,
  detail,
  href,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line-strong text-fg transition-colors duration-500 group-hover:border-accent group-hover:bg-accent group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold tracking-tight sm:text-2xl">{title}</span>
        <span className="mt-1 block break-all text-sm text-muted">{detail}</span>
      </span>
      <ArrowUpRight
        aria-hidden
        className="h-5 w-5 shrink-0 text-faint transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
      />
    </>
  );
  const className = "group flex w-full items-center gap-5 border-b border-line py-6 text-left";
  return href ? (
    <a href={href} className={className} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

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
    <section className="relative isolate overflow-hidden pb-24 pt-16 sm:pb-32 sm:pt-24">
      <div aria-hidden className="blueprint-grid absolute inset-x-0 top-0 -z-10 h-[40rem]" />
      <div aria-hidden className="accent-glow absolute -right-40 -top-20 -z-10 h-[36rem] w-[36rem] opacity-70" />
      <Wrap>
        <p className="label-mono reveal-up flex items-center gap-3">
          <span className="live-dot" aria-hidden />
          Contact
        </p>
        <h1 className="display reveal-up mt-6 max-w-4xl text-balance text-[3rem] sm:text-7xl lg:text-8xl" style={{ animationDelay: "80ms" }}>
          Let&apos;s build <span className="text-accent-bright">it.</span>
        </h1>
        <p
          className="reveal-up mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted"
          style={{ animationDelay: "160ms" }}
        >
          WhatsApp is the fastest way to reach me. Prefer structure? Use the project form, and it will open the
          conversation for you with the details filled in.
        </p>

        <div className="mt-16 grid gap-16 lg:grid-cols-12 lg:gap-10">
          <div className="reveal-up border-t border-line lg:col-span-7" style={{ animationDelay: "240ms" }}>
            <ChannelRow
              icon={<PenLine className="h-5 w-5" aria-hidden />}
              title="Start with the project form"
              detail="Name, budget and a short brief, then straight to WhatsApp"
              onClick={() => openBooking("General Inquiry")}
            />
            <ChannelRow
              icon={<FaWhatsapp className="h-5 w-5" aria-hidden />}
              title="WhatsApp"
              detail={formatWhatsAppDisplay(whatsappNumber)}
              href={whatsappUrl}
            />
            <ChannelRow icon={<Mail className="h-5 w-5" aria-hidden />} title="Email" detail={contactEmail} href={`mailto:${contactEmail}`} />

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { href: "https://www.tiktok.com/@ugoskii_51", label: "TikTok", icon: FaTiktok },
                { href: "https://www.snapchat.com/add/ugoskii_51", label: "Snapchat", icon: FaSnapchat },
              ].map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label} @ugoskii_51
                </a>
              ))}
            </div>
          </div>

          <aside className="reveal-up lg:col-span-5" style={{ animationDelay: "320ms" }} aria-labelledby="next-steps-title">
            <div className="edge relative rounded-[1.4rem] p-6 sm:p-8">
              <h2 id="next-steps-title" className="label-mono">
                What happens next
              </h2>
              <ol className="mt-6 space-y-6">
                {NEXT_STEPS.map(([title, body], index) => (
                  <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                    <span className="font-mono text-xs leading-6 text-accent-bright">0{index + 1}</span>
                    <div>
                      <p className="font-medium tracking-tight">{title}</p>
                      <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        <div className="mt-20">
          <ServicesGuarantees />
        </div>
      </Wrap>
    </section>
  );
}
