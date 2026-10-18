import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/site/button";

/// Server-rendered filter bar: a plain GET form, so filters live in the URL
/// (shareable, back-button friendly) and work before any JS loads.
export function FilterForm({ action, children, resetHref, count, noun }: { action: string; children: ReactNode; resetHref: string; count: number; noun: [string, string] }) {
  return (
    <form method="get" action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-raised p-4 sm:flex-row sm:flex-wrap sm:items-end" aria-label="Filters">
      {children}
      <div className="flex items-center gap-3">
        <button type="submit" className={buttonClass("primary", "sm")}>
          Apply
        </button>
        <Link href={resetHref} className="text-sm text-muted hover:text-fg">
          Reset
        </Link>
      </div>
      <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
        {count} {count === 1 ? noun[0] : noun[1]}
      </p>
    </form>
  );
}

export function FilterField({ label, children, grow = false }: { label: string; children: ReactNode; grow?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-muted ${grow ? "sm:min-w-56 sm:flex-1" : ""}`}>
      {label}
      {children}
    </label>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass("secondary", "sm")}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={buttonClass("secondary", "sm")}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function paginate<T>(rows: T[], pageParam: string | undefined, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(pages, Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1));
  return { page, pages, slice: rows.slice((page - 1) * size, page * size) };
}

export function hrefWith(base: string, params: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v && !(k === "page" && v === "1")) q.set(k, v);
  return `${base}${q.size ? `?${q}` : ""}`;
}
