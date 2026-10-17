import type { Metadata } from "next";
import { Wrap } from "@/components/site/wrap";
import { AuditRequestForm } from "@/components/audit-request-form";

export const metadata: Metadata = {
  title: "Free website audit",
  description: "Request a free, no-obligation review of your business website: speed, mobile layout, search basics and how easily customers can reach you.",
  alternates: { canonical: "/audit" },
};

const CHECKS = [
  "Does it load reliably, and over HTTPS?",
  "Does it work properly on a phone?",
  "Speed, measured with Google PageSpeed",
  "Search basics: page titles, descriptions and headings",
  "Can customers easily call, WhatsApp or email you?",
  "Broken links",
];

export default function AuditPage() {
  return (
    <section className="pb-24 pt-16 sm:pb-32 sm:pt-24">
      <Wrap className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <p className="label-mono reveal-up">Free audit</p>
          <h1 className="display reveal-up mt-6 text-balance text-5xl sm:text-6xl" style={{ animationDelay: "80ms" }}>
            Is your website working for you?
          </h1>
          <p className="reveal-up mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted" style={{ animationDelay: "160ms" }}>
            Send me your website and I&apos;ll review it myself, then email you a short, plain-English list of what&apos;s working and what
            could be better. No cost and no obligation. No website yet? Ask anyway.
          </p>
          <ul className="reveal-up mt-8 flex flex-col gap-3 text-sm" style={{ animationDelay: "220ms" }}>
            {CHECKS.map((check) => (
              <li key={check} className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bright" />
                <span className="text-fg/90">{check}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal-up lg:col-span-6 lg:col-start-7" style={{ animationDelay: "240ms" }}>
          <div className="edge relative rounded-[1.4rem] p-6 sm:p-8">
            <AuditRequestForm />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
