import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-dark transition-colors duration-200 hover:border-primary/50 hover:bg-primary hover:text-white",
        className
      )}
    >
      {children}
    </span>
  );
}
