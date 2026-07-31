import { clsx } from "clsx";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={clsx("flex flex-col gap-4", align === "center" && "items-center text-center")}>
      {eyebrow && (
        <span className="glass-panel inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {eyebrow}
        </span>
      )}
      <h2 className="font-serif text-3xl font-bold sm:text-4xl">{title}</h2>
      {description && (
        <p className={clsx("max-w-2xl text-foreground/70", align === "center" && "mx-auto")}>
          {description}
        </p>
      )}
    </div>
  );
}
