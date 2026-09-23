import { Reveal } from "@/components/reveal";

export type ReviewCardData = {
  id: string;
  clientName: string;
  position?: string | null;
  rating: number;
  message: string;
};

export function ReviewCard({ review, index = 0 }: { review: ReviewCardData; index?: number }) {
  return (
    <Reveal
      as="li"
      delay={(index % 3) * 70}
      className="mb-4 break-inside-avoid rounded-[1.25rem] border border-line bg-raised p-6 sm:p-7"
    >
      <figure className="flex flex-col gap-6">
        <p
          className="font-mono text-xs tracking-[0.2em] text-accent-bright"
          aria-label={`Rated ${review.rating} out of 5`}
        >
          {"★".repeat(review.rating)}
          <span className="text-faint">{"★".repeat(5 - review.rating)}</span>
        </p>
        <blockquote className="whitespace-pre-line text-pretty leading-relaxed text-fg/85">
          &ldquo;{review.message.trim()}&rdquo;
        </blockquote>
        <figcaption className="border-t border-line pt-4">
          <p className="text-sm font-medium">{review.clientName}</p>
          {review.position && <p className="mt-0.5 text-xs text-faint">{review.position}</p>}
        </figcaption>
      </figure>
    </Reveal>
  );
}
