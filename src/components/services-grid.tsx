import { Reveal } from "@/components/reveal";
import { BookButton } from "@/components/site/book-button";
import type { ServiceCategory } from "@/lib/services-data";

/// The admin-managed service catalogue. Each category is a numbered block
/// with a sticky title column; every service row can be booked directly
/// (it pre-selects that service in the WhatsApp booking form).
export function ServicesGrid({ categories }: { categories: ServiceCategory[] }) {
  return (
    <div className="border-t border-line">
      {categories.map((category, categoryIndex) => (
        <section
          key={category.id}
          aria-labelledby={`cat-${category.id}`}
          className="grid gap-8 border-b border-line py-12 md:grid-cols-12 md:gap-10 md:py-16"
        >
          <Reveal className="md:sticky md:top-28 md:col-span-4 md:self-start">
            <div>
              <p className="font-mono text-xs text-accent-bright">{String(categoryIndex + 1).padStart(2, "0")}</p>
              <h3 id={`cat-${category.id}`} className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {category.title}
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">{category.description}</p>
            </div>
          </Reveal>
          <ul className="md:col-span-8">
            {category.services.map((service, index) => (
              <Reveal
                as="li"
                key={service.id}
                delay={Math.min(index, 4) * 50}
                className="group flex flex-col gap-4 border-t border-line py-5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
              >
                <div className="min-w-0">
                  <h4 className="font-medium tracking-tight">{service.title}</h4>
                  <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">{service.description}</p>
                </div>
                <BookButton
                  service={service.title}
                  variant="secondary"
                  arrow="right"
                  className="shrink-0 self-start !min-h-10 !px-4 !py-2 !text-xs sm:self-center"
                >
                  <span className="sr-only">Book {service.title}: </span>
                  Book
                </BookButton>
              </Reveal>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
