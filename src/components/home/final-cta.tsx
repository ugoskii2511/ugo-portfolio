import { Wrap } from "@/components/site/wrap";
import { BookButton } from "@/components/site/book-button";
import { LinkButton } from "@/components/site/button";
import { Reveal } from "@/components/reveal";

/// The closing statement used at the end of most pages.
export function FinalCta({ contactEmail }: { contactEmail: string }) {
  return (
    <section aria-labelledby="final-cta-title" className="relative isolate overflow-hidden border-t border-line">
      <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="accent-glow absolute bottom-[-18rem] left-1/2 -z-10 h-[36rem] w-[60rem] -translate-x-1/2"
      />
      <Wrap className="py-24 sm:py-32 lg:py-40">
        <Reveal className="flex flex-col items-start">
          <p className="label-mono flex items-center gap-3">
            <span className="live-dot" aria-hidden />
            Taking on new projects
          </p>
          <h2 id="final-cta-title" className="display mt-8 max-w-5xl text-balance text-[2.75rem] sm:text-7xl lg:text-[6.5rem]">
            Have an idea worth building?{" "}
            <span className="text-accent-bright">Let&apos;s build it.</span>
          </h2>
          <p className="mt-8 max-w-lg text-pretty text-lg text-muted">
            Tell me what you&apos;re making. You&apos;ll get a straight answer on scope, timeline and cost,
            usually the same day.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <BookButton size="lg" magnetic>
              Start a project
            </BookButton>
            <LinkButton href={`mailto:${contactEmail}`} variant="secondary" size="lg" arrow={false}>
              {contactEmail}
            </LinkButton>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}
