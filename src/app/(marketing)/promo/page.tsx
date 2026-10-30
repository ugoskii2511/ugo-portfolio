import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Cloud,
  Gift,
  Globe,
  Headphones,
  LayoutTemplate,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Wrap } from "@/components/site/wrap";
import { LinkButton } from "@/components/site/button";
import { Reveal } from "@/components/reveal";
import { DEFAULT_WHATSAPP_NUMBER, getSettings } from "@/lib/content";
import { buildWhatsAppChatUrl } from "@/lib/whatsapp";
import { PROMO, promoPrice } from "@/lib/promo";

export const metadata: Metadata = {
  title: `Business website promo: ${promoPrice()} with free domain & hosting`,
  description: `${PROMO.intro} Promo price ${promoPrice()}, with a free .name.ng domain and 1 year of hosting. Only ${PROMO.slots} slots available.`,
  alternates: { canonical: PROMO.path },
  openGraph: {
    title: `Get your business online for ${promoPrice()}`,
    description: `Professional website + ${PROMO.bonus.toLowerCase()}. Only ${PROMO.slots} slots available.`,
    images: [{ url: PROMO.image.src, width: PROMO.image.width, height: PROMO.image.height, alt: PROMO.image.alt }],
  },
};

const ICONS: Record<string, LucideIcon> = {
  design: LayoutTemplate,
  mobile: Smartphone,
  whatsapp: MessageCircle,
  contact: Mail,
  seo: Search,
  social: Share2,
  ssl: ShieldCheck,
  support: Timer,
  domain: Globe,
  hosting: Cloud,
  revisions: RefreshCw,
};

const PROMISE_ICONS: LucideIcon[] = [BadgeCheck, Zap, Headphones];

export default async function PromoPage() {
  if (!PROMO.active) notFound();
  const settings = await getSettings();
  const whatsappUrl = buildWhatsAppChatUrl(PROMO.whatsappMessage, settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER);

  return (
    <article>
      <header className="pb-16 pt-10 sm:pt-14">
        <Wrap className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-7">
            <p className="reveal-up inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-accent-bright">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              {PROMO.eyebrow}
            </p>
            <h1 className="display reveal-up mt-6 text-balance text-[2.75rem] sm:text-6xl lg:text-7xl" style={{ animationDelay: "80ms" }}>
              {PROMO.title}
            </h1>
            <p className="reveal-up mt-5 max-w-xl text-pretty text-xl font-medium leading-snug sm:text-2xl" style={{ animationDelay: "120ms" }}>
              {PROMO.subtitle}
            </p>
            <p className="reveal-up mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted" style={{ animationDelay: "160ms" }}>
              {PROMO.intro}
            </p>

            <div className="reveal-up mt-8 grid max-w-xl gap-4 sm:grid-cols-[1fr_auto]" style={{ animationDelay: "200ms" }}>
              <div className="edge rounded-2xl p-5">
                <p className="label-mono">Promo price</p>
                <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">{promoPrice()}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-accent-bright">
                  <Gift className="h-4 w-4" aria-hidden />
                  {PROMO.bonus}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5 sm:flex-col sm:justify-center sm:text-center">
                <Timer className="h-6 w-6 shrink-0 text-amber-300" aria-hidden />
                <p className="text-sm leading-snug">
                  <span className="block text-2xl font-semibold text-amber-200">Only {PROMO.slots}</span>
                  slots available
                </p>
              </div>
            </div>

            <div className="reveal-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <LinkButton href={whatsappUrl} arrow="out" aria-label="Message me on WhatsApp for a free consultation (opens in a new tab)">
                DM for a free consultation
              </LinkButton>
              <LinkButton href="/work" variant="secondary">
                See my work
              </LinkButton>
            </div>
          </div>

          <div className="reveal-up lg:col-span-5" style={{ animationDelay: "280ms" }}>
            <a
              href={PROMO.image.src}
              target="_blank"
              rel="noopener noreferrer"
              className="group edge relative mx-auto block max-w-md overflow-hidden rounded-[1.5rem] p-2 transition-transform duration-500 hover:-translate-y-1"
              aria-label="Open the promo flyer full size (opens in a new tab)"
            >
              <Image
                src={PROMO.image.src}
                alt={PROMO.image.alt}
                width={PROMO.image.width}
                height={PROMO.image.height}
                sizes="(min-width: 1024px) 420px, (min-width: 640px) 448px, 90vw"
                priority
                className="h-auto w-full rounded-[1.1rem]"
              />
              <span className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                View full size
              </span>
            </a>
          </div>
        </Wrap>
      </header>

      <section aria-labelledby="includes-title" className="border-t border-line py-20 sm:py-24">
        <Wrap>
          <Reveal>
            <p className="label-mono">What you get</p>
            <h2 id="includes-title" className="display mt-4 text-balance text-4xl sm:text-5xl">
              Everything in the {promoPrice()} package.
            </h2>
          </Reveal>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROMO.includes.map((item, index) => {
              const Icon = ICONS[item.key] ?? BadgeCheck;
              return (
                <Reveal as="li" key={item.key} delay={(index % 3) * 60} className="edge flex gap-4 rounded-2xl p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line-strong text-accent-bright" aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </Wrap>
      </section>

      <section aria-labelledby="for-title" className="border-t border-line py-20 sm:py-24">
        <Wrap className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="label-mono">Perfect for</p>
            <h2 id="for-title" className="display mt-4 text-balance text-4xl">
              Built for businesses ready to grow.
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-8">
            <ul className="flex flex-wrap gap-3">
              {PROMO.perfectFor.map((who) => (
                <li key={who} className="rounded-full border border-line-strong px-4 py-2 text-sm">
                  {who}
                </li>
              ))}
            </ul>
            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {PROMO.promises.map((promise, index) => {
                const Icon = PROMISE_ICONS[index] ?? BadgeCheck;
                return (
                  <li key={promise} className="flex items-center gap-3 text-sm">
                    <Icon className="h-5 w-5 shrink-0 text-accent-bright" aria-hidden />
                    {promise}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </Wrap>
      </section>

      <section aria-labelledby="cta-title" className="border-t border-line py-20 sm:py-24">
        <Wrap>
          <Reveal className="edge relative isolate overflow-hidden rounded-[1.75rem] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
            <div aria-hidden className="accent-glow absolute left-1/2 top-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2" />
            <p className="label-mono">{PROMO.tagline}</p>
            <h2 id="cta-title" className="display mx-auto mt-4 max-w-2xl text-balance text-4xl sm:text-5xl">
              {PROMO.closing}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted">
              {promoPrice()} with {PROMO.bonus.toLowerCase()}. Only {PROMO.slots} slots, so message me to claim yours.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <LinkButton href={whatsappUrl} arrow="out" aria-label="Message me on WhatsApp for a free consultation (opens in a new tab)">
                DM for a free consultation
              </LinkButton>
              <LinkButton href="/contact" variant="secondary">
                Other ways to get in touch
              </LinkButton>
            </div>
          </Reveal>
          <ul className="mt-10 flex flex-col gap-1 text-xs text-faint sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5">
            {PROMO.terms.map((term) => (
              <li key={term}>* {term}</li>
            ))}
          </ul>
        </Wrap>
      </section>
    </article>
  );
}
