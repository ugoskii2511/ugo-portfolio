"use client";

import { StarRating } from "@/components/star-rating";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";

export type ReviewCardData = {
  id: string;
  clientName: string;
  rating: number;
  message: string;
};

export function ReviewCard({ review }: { review: ReviewCardData }) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <Reveal
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel relative flex flex-col gap-3 overflow-hidden rounded-2xl p-6 hover:-translate-y-1"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <StarRating value={review.rating} />
      <p className="font-serif text-base italic text-foreground/80">&ldquo;{review.message}&rdquo;</p>
      <p className="text-sm font-semibold text-primary">{review.clientName}</p>
    </Reveal>
  );
}
