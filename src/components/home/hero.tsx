import { Fragment } from "react";
import { Wrap } from "@/components/site/wrap";
import { LinkButton } from "@/components/site/button";
import { BookButton } from "@/components/site/book-button";
import { HeroConsole, type ConsoleProject } from "@/components/home/hero-console";

/// Splits the (admin-editable, plain-text) headline into words so each can
/// rise into place. Pure CSS, so it plays on first paint.
function RevealWords({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={index}>
          <span className="word">
            <span style={{ animationDelay: `${startDelay + index * 55}ms` }}>{word}</span>
          </span>
          {index < words.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

export function Hero({
  availabilityStatus,
  heroHeadline,
  heroIntro,
  consoleProjects,
}: {
  availabilityStatus: string;
  heroHeadline: string;
  heroIntro: string;
  consoleProjects: ConsoleProject[];
}) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div aria-hidden className="blueprint-grid absolute inset-0 -z-10 opacity-70" />
      <div aria-hidden className="accent-glow absolute -right-40 -top-40 -z-10 h-[40rem] w-[40rem] opacity-80" />

      <Wrap className="grid gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-7">
          <p className="reveal-up inline-flex items-center gap-2.5 rounded-full border border-line bg-white/[0.02] py-1.5 pl-3 pr-4 text-xs text-muted">
            <span className="live-dot" aria-hidden />
            {availabilityStatus}
          </p>

          <h1
            id="hero-title"
            className="display mt-7 text-balance text-[2.9rem] sm:text-7xl lg:text-[5.4rem] xl:text-[6rem]"
          >
            <RevealWords text={heroHeadline} startDelay={120} />
          </h1>

          <p
            className="reveal-up mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted"
            style={{ animationDelay: "520ms" }}
          >
            {heroIntro}
          </p>

          <div
            className="reveal-up mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "640ms" }}
          >
            <LinkButton href="#work" size="lg">
              Explore my work
            </LinkButton>
            <BookButton size="lg" variant="secondary" magnetic>
              Start a project
            </BookButton>
          </div>

          <dl
            className="reveal-up mt-14 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-6"
            style={{ animationDelay: "760ms" }}
          >
            {[
              ["Builds", "Web · Apps · SaaS"],
              ["Scope", "Concept → production"],
              ["Based", "Nigeria · remote"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="label-mono !text-[0.62rem]">{label}</dt>
                <dd className="mt-1.5 text-[0.8rem] text-fg sm:text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {consoleProjects.length > 0 && (
          <div className="reveal-up lg:col-span-5" style={{ animationDelay: "380ms" }}>
            <HeroConsole projects={consoleProjects} />
          </div>
        )}
      </Wrap>
    </section>
  );
}
