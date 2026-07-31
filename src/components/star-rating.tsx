"use client";

import { Star } from "lucide-react";
import { clsx } from "clsx";

export function StarRating({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const interactive = Boolean(onChange);

  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-pressed={interactive ? value === star : undefined}
          className={clsx(
            "transition",
            interactive && "cursor-pointer hover:scale-110",
            !interactive && "cursor-default"
          )}
        >
          <Star
            size={size}
            className={clsx(
              star <= value ? "fill-primary text-primary" : "fill-transparent text-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}
