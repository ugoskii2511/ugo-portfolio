import { Info } from "lucide-react";
import { clsx } from "clsx";

/// The full pricing disclaimer, shown in readable text wherever prices
/// appear (never shortened or hidden in a tooltip).
export function PricingNotice({ text, className, id }: { text: string; className?: string; id?: string }) {
  return (
    <aside
      id={id}
      aria-label="Important pricing notice"
      className={clsx("rounded-[1.25rem] border border-amber-400/30 bg-amber-400/[0.06] p-5 sm:p-6", className)}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        Important Pricing Notice
      </p>
      <p className="mt-2.5 text-pretty text-sm leading-relaxed text-fg/85 sm:text-[0.95rem]">{text}</p>
    </aside>
  );
}
