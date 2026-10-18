"use client";

import { useId, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { Segmented, StatusPill, type Tone } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import {
  PAYMENT_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  RANGE_LABEL,
  type PaymentStatus,
  type ProjectStatus,
  type RangePreset,
} from "@/lib/business-calc";
import { formatKobo, parseNairaToKobo } from "@/lib/money";

const PROJECT_TONE: Record<ProjectStatus, Tone> = {
  INQUIRY: "neutral",
  QUOTED: "accent",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  ON_HOLD: "warning",
  CANCELLED: "danger",
};
const PAYMENT_TONE: Record<PaymentStatus, Tone> = { UNPAID: "danger", PARTIAL: "warning", PAID: "success" };

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return <StatusPill tone={PROJECT_TONE[status]}>{PROJECT_STATUS_LABEL[status]}</StatusPill>;
}

export function PaymentStatusPill({ status }: { status: PaymentStatus | null }) {
  if (!status) return <span className="text-xs text-faint">—</span>;
  return <StatusPill tone={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</StatusPill>;
}

/// Amount field: accepts "15000", "15,000.50" or "₦15,000" and shows exactly
/// what will be saved, so typos are caught before submitting.
export function MoneyInput({
  id,
  name,
  label,
  value,
  onChange,
  required,
  hint,
}: {
  id?: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const kobo = parseNairaToKobo(value);
  const invalid = value.trim() !== "" && kobo === null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-[0.8rem] font-medium text-fg/90">
        {label}
        {!required && <span className="font-normal text-faint"> (optional)</span>}
      </label>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
          ₦
        </span>
        <input
          id={fieldId}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={`${fieldId}-preview`}
          className={clsx("field !pl-8 tabular-nums", invalid && "!border-red-400/60")}
          placeholder="0"
        />
      </div>
      <p id={`${fieldId}-preview`} className={clsx("text-xs", invalid ? "text-red-300" : "text-faint")} aria-live="polite">
        {invalid ? "Use digits, with up to 2 decimals (e.g. 15000 or 15,000.50)." : kobo !== null ? `Saved as ${formatKobo(kobo)}` : hint ?? " "}
      </p>
    </div>
  );
}

/// Today / week / month / year / all / custom, kept in the URL so the page
/// (and its server-side figures) follows the filter.
export function RangeFilter({ preset, from, to }: { preset: RangePreset; from: string | null; to: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [customFrom, setCustomFrom] = useState(preset === "custom" ? from ?? "" : "");
  const [customTo, setCustomTo] = useState(preset === "custom" ? to ?? "" : "");
  const go = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    q.delete("page");
    router.push(`${pathname}?${q.toString()}`);
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Segmented<RangePreset>
        label="Date range"
        value={preset}
        onChange={(value) => (value === "custom" ? go({ range: "custom", from: customFrom || from, to: customTo || to }) : go({ range: value, from: null, to: null }))}
        options={(["today", "week", "month", "year", "all", "custom"] as RangePreset[]).map((v) => ({ value: v, label: RANGE_LABEL[v] }))}
      />
      {preset === "custom" && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ range: "custom", from: customFrom, to: customTo });
          }}
        >
          <label className="sr-only" htmlFor="range-from">
            From
          </label>
          <input id="range-from" type="date" required value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="field !w-auto !py-1.5 text-sm" />
          <span className="text-xs text-muted">to</span>
          <label className="sr-only" htmlFor="range-to">
            To
          </label>
          <input id="range-to" type="date" required value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="field !w-auto !py-1.5 text-sm" />
          <button type="submit" className={buttonClass("secondary", "sm")}>
            Apply
          </button>
        </form>
      )}
    </div>
  );
}

/// Soft delete / restore buttons with confirmation and a toast.
export function DeleteRestore({
  url,
  deleted,
  noun,
  detail,
  onDone,
  compact = false,
}: {
  url: string;
  deleted: boolean;
  noun: string;
  detail?: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!deleted) {
      const ok = await confirm({
        title: `Delete this ${noun}?`,
        description: detail ?? `It will be removed from every list and total. Nothing is erased: you can restore it from “Show deleted”.`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await adminRequest(url, deleted ? { method: "PATCH", body: { restore: true } } : { method: "DELETE" });
      toast.success(deleted ? `${capitalise(noun)} restored.` : `${capitalise(noun)} deleted.`);
      onDone?.();
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" disabled={busy} onClick={run} className={buttonClass(deleted ? "secondary" : "ghost", "sm", compact ? "!px-2.5" : "")}>
      {deleted ? "Restore" : "Delete"}
    </button>
  );
}

function capitalise(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

export function Money({ kobo, className, tone }: { kobo: number | null; className?: string; tone?: "auto" }) {
  return (
    <span className={clsx("tabular-nums", tone === "auto" && kobo !== null && kobo < 0 && "text-red-300", className)}>{formatKobo(kobo)}</span>
  );
}

/// Received vs spent bars per month. Plain HTML so it's readable by screen
/// readers (each bar has a text label) and needs no chart library.
export function MonthChart({ data, labels, expensesOnly = false }: { data: { month: string; received: number; spent: number }[]; labels: Record<string, string>; expensesOnly?: boolean }) {
  const max = Math.max(1, ...data.flatMap((d) => (expensesOnly ? [d.spent] : [d.received, d.spent])));
  const [active, setActive] = useState<number | null>(null);
  const shown = active !== null ? data[active] : null;
  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {!expensesOnly && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-accent" /> Received
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-amber-400/80" /> Expenses
        </span>
        <span className="ml-auto font-mono text-fg/80" aria-live="polite">
          {shown ? (expensesOnly ? `${labels[shown.month]}: ${formatKobo(shown.spent)} spent` : `${labels[shown.month]}: ${formatKobo(shown.received)} in · ${formatKobo(shown.spent)} out`) : "Hover or focus a month"}
        </span>
      </div>
      <ol className="mt-4 flex h-44 items-end gap-1.5 sm:gap-2" aria-label="Money received and spent per month">
        {data.map((d, i) => (
          <li key={d.month} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={expensesOnly ? `${labels[d.month]}: expenses ${formatKobo(d.spent)}` : `${labels[d.month]}: received ${formatKobo(d.received)}, expenses ${formatKobo(d.spent)}`}
              className="flex w-full flex-1 items-end justify-center gap-0.5 rounded-md outline-offset-2"
            >
              {!expensesOnly && <span className="w-1/2 max-w-4 rounded-t-sm bg-accent transition-[height]" style={{ height: `${(d.received / max) * 100}%`, minHeight: d.received ? 2 : 0 }} />}
              <span className="w-1/2 max-w-4 rounded-t-sm bg-amber-400/80 transition-[height]" style={{ height: `${(d.spent / max) * 100}%`, minHeight: d.spent ? 2 : 0 }} />
            </button>
            <span className="text-[0.6rem] text-faint">{labels[d.month].split(" ")[0]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SectionNote({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-faint">{children}</p>;
}
