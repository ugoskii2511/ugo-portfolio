import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { Spot } from "@/components/site/spot";

export type Testimonial = {
  id: string;
  clientName: string;
  position: string | null;
  rating: number;
  message: string;
  project?: { name: string; slug: string };
};

function Stars({ rating }: { rating: number }) {
  return (
    <p className="font-mono text-xs tracking-[0.2em] text-accent-bright" aria-label={`Rated ${rating} out of 5`}>
      {"★".repeat(rating)}
      <span className="text-faint">{"★".repeat(5 - rating)}</span>
    </p>
  );
}

function Attribution({ review }: { review: Testimonial }) {
  return (
    <footer className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised-2 text-xs font-medium text-muted"
      >
        {review.clientName.replace(/[^\p{L}]/gu, "").charAt(0).toUpperCase() || "·"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{review.clientName}</p>
        {review.position && <p className="truncate text-xs text-faint">{review.position}</p>}
        {review.project && (
          <Link
            href={`/work/${review.project.slug}`}
            className="mt-1 inline-block text-xs text-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
          >
            <span className="sr-only">{review.project.name}: </span>View the project →
          </Link>
        )}
      </div>
    </footer>
  );
}

/// Real, admin-approved client reviews. The longest one leads as a large
/// pull quote; the rest sit beside it. Nothing is rendered if there are none.
export function Testimonials({ reviews }: { reviews: Testimonial[] }) {
  if (reviews.length === 0) return null;
  const [lead, ...rest] = [...reviews].sort((a, b) => b.message.length - a.message.length);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Reveal className="min-w-0 lg:col-span-7">
        <Spot className="edge flex h-full flex-col justify-between gap-10 rounded-[1.5rem] p-7 sm:p-10">
          <Stars rating={lead.rating} />
          <blockquote className="flex flex-col gap-10">
            <p className="whitespace-pre-line text-pretty text-xl leading-snug tracking-tight text-fg sm:text-2xl">
              &ldquo;{lead.message.trim()}&rdquo;
            </p>
            <Attribution review={lead} />
          </blockquote>
        </Spot>
      </Reveal>

      {rest.length > 0 && (
        <ul className="grid min-w-0 gap-4 lg:col-span-5">
          {rest.slice(0, 3).map((review, index) => (
            <Reveal as="li" key={review.id} delay={index * 80} className="min-w-0">
              <Spot className="flex h-full flex-col gap-5 rounded-[1.25rem] border border-line bg-raised p-6">
                <blockquote className="flex h-full flex-col justify-between gap-5">
                  <p className="line-clamp-5 whitespace-pre-line text-pretty text-[0.95rem] leading-relaxed text-fg/85">
                    &ldquo;{review.message.trim()}&rdquo;
                  </p>
                  <Attribution review={review} />
                </blockquote>
              </Spot>
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
