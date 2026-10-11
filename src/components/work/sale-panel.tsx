import { Check } from "lucide-react";
import { BookButton } from "@/components/site/book-button";
import { formatPrice, type Sale } from "@/lib/projects";

/// "Buy this platform" offer on a case study. The Contact button opens the
/// regular booking form pre-filled with the purchase, so the enquiry is saved
/// as a lead in the admin before continuing on WhatsApp.
export function SalePanel({ sale, projectName }: { sale: Sale; projectName: string }) {
  const price = formatPrice(sale);
  return (
    <section
      aria-labelledby="sale-title"
      className="edge relative isolate overflow-hidden rounded-[1.75rem] p-6 sm:p-10"
    >
      <div aria-hidden className="accent-glow absolute -right-32 -top-32 -z-10 h-80 w-80" />
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <p className="label-mono flex items-center gap-3">
            <span className="live-dot" aria-hidden />
            For sale
          </p>
          <h2 id="sale-title" className="display mt-5 text-balance text-4xl sm:text-5xl">
            Own {projectName}.
          </h2>
          <p className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-semibold tracking-tight text-accent-bright sm:text-5xl">{price}</span>
            <span className="text-sm text-muted">one-time payment</span>
          </p>
          <p className="mt-4 max-w-sm text-pretty leading-relaxed text-muted">
            The whole platform, handed over completely once payment is made.
          </p>
        </div>

        <div className="flex flex-col lg:col-span-7">
          <h3 className="label-mono">What you get</h3>
          <ul className="mt-5 flex flex-col gap-4">
            {sale.includes.map((item) => (
              <li key={item} className="flex gap-3 text-pretty leading-relaxed text-fg/90">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-soft text-accent-bright"
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 border-t border-line pt-6">
            <BookButton size="lg" magnetic service={`Buy ${projectName} (${price})`} budget={price}>
              Contact me
            </BookButton>
            <p className="mt-3 text-xs text-faint">Ask anything before you buy. I usually reply the same day.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
