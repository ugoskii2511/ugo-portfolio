import type { Sale } from "@/lib/projects";

// Type-only import: this badge is also rendered inside client components,
// which must not pull in projects.ts (it imports the database client).
export function SaleBadge({ sale }: { sale: Sale }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-bright">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent-bright" />
      For sale · ₦{sale.price.toLocaleString("en-NG")}
    </span>
  );
}
