import { FaWhatsapp } from "react-icons/fa6";
import { Reveal } from "@/components/reveal";
import { buttonClass } from "@/components/site/button";
import { formatPrice, type Sale } from "@/lib/projects";

/// The full feature breakdown for a product that's for sale, grouped under
/// headings, followed by the closing WhatsApp call to action.
export function SaleFeatures({ sale, projectName }: { sale: Sale; projectName: string }) {
  if (!sale.groups?.length) return null;
  const featureCount = sale.groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section aria-labelledby="features-title">
      <div className="flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono">Everything included</p>
          <h2 id="features-title" className="display mt-4 text-balance text-4xl sm:text-5xl">
            What {projectName} can do.
          </h2>
        </div>
        <p className="font-mono text-xs text-faint">
          {featureCount} features · {sale.groups.length} areas
        </p>
      </div>

      <div className="grid gap-x-10 md:grid-cols-2">
        {sale.groups.map((group, index) => (
          <Reveal key={group.title} as="article" className="border-b border-line py-8" aria-labelledby={`group-${index}`}>
            <p className="font-mono text-xs text-accent-bright">{String(index + 1).padStart(2, "0")}</p>
            <h3 id={`group-${index}`} className="mt-3 text-xl font-semibold tracking-tight">
              {group.title}
            </h3>
            {group.intro && <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{group.intro}</p>}
            <ul className="mt-5 flex flex-col gap-2.5">
              {group.items.map((item) => (
                <li key={item} className="flex gap-3 text-pretty text-[0.95rem] leading-relaxed text-fg/90">
                  <span aria-hidden className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-accent-bright" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      {sale.whatsappUrl && <SaleCta sale={sale} projectName={projectName} />}
    </section>
  );
}

function SaleCta({ sale, projectName }: { sale: Sale; projectName: string }) {
  const price = formatPrice(sale);
  const message = `Hi Ugochukwu, I'm interested in buying ${projectName} (${price}).`;
  const href = `${sale.whatsappUrl}?text=${encodeURIComponent(message)}`;
  return (
    <Reveal className="edge relative isolate mt-14 overflow-hidden rounded-[1.75rem] p-7 text-center sm:p-12">
      <div aria-hidden className="blueprint-grid absolute inset-0 -z-10 opacity-70" />
      <div aria-hidden className="accent-glow absolute -bottom-40 left-1/2 -z-10 h-80 w-[36rem] -translate-x-1/2" />
      <p className="label-mono flex items-center justify-center gap-3">
        <span className="live-dot" aria-hidden />
        Available now · {price}
      </p>
      <h2 className="display mx-auto mt-5 max-w-2xl text-balance text-3xl sm:text-5xl">
        Ready to own {projectName}?
      </h2>
      <p className="mx-auto mt-5 max-w-lg text-pretty leading-relaxed text-muted">
        Message me on WhatsApp to ask questions, see it in action, or agree the handover.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass("primary", "lg", "mt-8")}
        aria-label={`Chat on WhatsApp about buying ${projectName} (opens in a new tab)`}
      >
        <FaWhatsapp className="h-5 w-5" aria-hidden />
        Chat on WhatsApp
      </a>
    </Reveal>
  );
}
