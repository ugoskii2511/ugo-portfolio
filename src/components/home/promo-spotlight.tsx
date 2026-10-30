import Image from "next/image";
import Link from "next/link";
import { Gift, Timer, Zap } from "lucide-react";
import { Wrap } from "@/components/site/wrap";
import { LinkButton } from "@/components/site/button";
import { Reveal } from "@/components/reveal";
import { PROMO, promoPrice } from "@/lib/promo";

/// Homepage callout for the current promo; renders nothing when it's off.
export function PromoSpotlight() {
  if (!PROMO.active) return null;
  return (
    <section aria-labelledby="promo-title" className="pt-16 sm:pt-20">
      <Wrap>
        <Reveal className="edge relative isolate grid items-center gap-8 overflow-hidden rounded-[1.75rem] p-6 sm:p-10 md:grid-cols-[1fr_auto]">
          <div aria-hidden className="accent-glow absolute -right-20 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-y-1/2 opacity-70" />
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-accent-bright">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              {PROMO.eyebrow}
            </p>
            <h2 id="promo-title" className="display mt-5 text-balance text-3xl sm:text-5xl">
              A professional website for {promoPrice()}.
            </h2>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted">
              Custom design, mobile-friendly, WhatsApp and contact form, basic SEO and SSL, plus a free .name.ng domain and 1 year of hosting.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li className="inline-flex items-center gap-2 text-accent-bright">
                <Gift className="h-4 w-4" aria-hidden />
                {PROMO.bonus}
              </li>
              <li className="inline-flex items-center gap-2 text-amber-300">
                <Timer className="h-4 w-4" aria-hidden />
                Only {PROMO.slots} slots available
              </li>
            </ul>
            <div className="mt-7">
              <LinkButton href={PROMO.path}>See the offer</LinkButton>
            </div>
          </div>
          <Link
            href={PROMO.path}
            tabIndex={-1}
            aria-hidden
            className="mx-auto hidden w-48 rotate-[2deg] overflow-hidden rounded-2xl border border-line-strong shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] transition-transform duration-500 hover:rotate-0 sm:block lg:w-56"
          >
            <Image src={PROMO.image.src} alt="" width={PROMO.image.width} height={PROMO.image.height} sizes="224px" className="h-auto w-full" />
          </Link>
        </Reveal>
      </Wrap>
    </section>
  );
}
