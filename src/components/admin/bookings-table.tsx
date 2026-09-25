"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, ArrowUpRight, Check, Copy, Download, Inbox } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { EmptyState, SearchInput, StatusPill, formatDate, formatRelative } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast-provider";

export type AdminBooking = {
  id: string;
  clientName: string;
  budget: string;
  projectType: string;
  details: string;
  whatsappUrl: string;
  createdAt: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function toCsvValue(value: string) {
  // Prefix cells that spreadsheet apps would evaluate as formulas.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(bookings: AdminBooking[]) {
  const header = ["Client", "Budget", "Project Type", "Details", "Submitted"];
  const rows = bookings.map((b) => [b.clientName, b.budget, b.projectType, b.details, new Date(b.createdAt).toISOString()]);
  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `booking-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/// Links are generated server-side at submission time; only render ones
/// that are genuinely WhatsApp links.
function safeWhatsAppUrl(url: string) {
  return /^https:\/\/wa\.me\//.test(url) ? url : null;
}

/// Lightweight inbox for booking-form leads: list on the left, the full
/// brief on the right. On phones the detail replaces the list, with a back
/// button. There is no read/unread state in the schema, so "New" only means
/// "submitted in the last 7 days".
export function BookingsTable({ bookings, initialSelectedId }: { bookings: AdminBooking[]; initialSelectedId?: string }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId && bookings.some((b) => b.id === initialSelectedId) ? initialSelectedId : bookings[0]?.id ?? null
  );
  // On mobile, show the detail pane only after an explicit selection.
  const [mobileDetail, setMobileDetail] = useState(Boolean(initialSelectedId));
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.clientName.toLowerCase().includes(q) ||
        b.projectType.toLowerCase().includes(q) ||
        b.budget.toLowerCase().includes(q) ||
        b.details.toLowerCase().includes(q)
    );
  }, [bookings, query]);

  const selected = bookings.find((b) => b.id === selectedId) ?? null;

  async function copyBrief(booking: AdminBooking) {
    const text = `${booking.clientName}\nProject: ${booking.projectType}\nBudget: ${booking.budget}\nSubmitted: ${formatDate(
      booking.createdAt,
      { dateStyle: "medium", timeStyle: "short" }
    )}\n\n${booking.details}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Brief copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-5 w-5" />}
        title="No leads yet"
        description="When someone submits the booking form on your site, their brief lands here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, project, budget, brief…"
          label="Search leads"
          className="w-full sm:max-w-sm"
        />
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs text-faint" aria-live="polite">
            {filtered.length} of {bookings.length}
          </p>
          <button type="button" onClick={() => downloadCsv(filtered)} className={buttonClass("secondary", "sm")}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-line bg-raised lg:grid-cols-12 lg:min-h-[32rem]">
        {/* List */}
        <div className={clsx("border-line lg:col-span-5 lg:block lg:border-r", mobileDetail ? "hidden" : "block")}>
          {filtered.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">No leads match &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul aria-label="Leads" className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {filtered.map((booking) => {
                const active = booking.id === selectedId;
                const isNew = now - new Date(booking.createdAt).getTime() < WEEK_MS;
                return (
                  <li key={booking.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => {
                        setSelectedId(booking.id);
                        setMobileDetail(true);
                      }}
                      className={clsx(
                        "relative flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors",
                        active ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
                      )}
                    >
                      {active && <span aria-hidden className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent-bright" />}
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          {isNew && <span aria-label="New" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bright" />}
                          <span className="truncate text-sm font-medium">{booking.clientName}</span>
                        </span>
                        <span className="shrink-0 text-xs text-faint">{formatRelative(booking.createdAt, now)}</span>
                      </span>
                      <span className="truncate text-xs text-fg/80">
                        {booking.projectType} <span className="text-faint">·</span> {booking.budget}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted">{booking.details}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className={clsx("lg:col-span-7 lg:block", mobileDetail ? "block" : "hidden")}>
          {selected ? (
            <article aria-labelledby="lead-title" className="flex h-full flex-col">
              <div className="border-b border-line px-5 py-5 sm:px-6">
                <button
                  type="button"
                  onClick={() => setMobileDetail(false)}
                  className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-fg lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  All leads
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {now - new Date(selected.createdAt).getTime() < WEEK_MS && <StatusPill tone="accent">New</StatusPill>}
                  <span className="text-xs text-faint">
                    {formatDate(selected.createdAt, { dateStyle: "full", timeStyle: "short" })}
                  </span>
                </div>
                <h2 id="lead-title" className="mt-3 text-2xl font-semibold tracking-tight">
                  {selected.clientName}
                </h2>
                <dl className="mt-5 grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <dt className="label-mono !text-[0.6rem]">Project</dt>
                    <dd className="mt-1 break-words text-sm">{selected.projectType}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="label-mono !text-[0.6rem]">Budget</dt>
                    <dd className="mt-1 break-words text-sm">{selected.budget}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex-1 px-5 py-5 sm:px-6">
                <h3 className="label-mono !text-[0.6rem]">Brief</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-fg/90">{selected.details}</p>
              </div>
              <div className="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:px-6">
                {safeWhatsAppUrl(selected.whatsappUrl) && (
                  <a
                    href={safeWhatsAppUrl(selected.whatsappUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("primary", "sm")}
                  >
                    Open WhatsApp message
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </a>
                )}
                <button type="button" onClick={() => copyBrief(selected)} className={buttonClass("secondary", "sm")}>
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? "Copied" : "Copy brief"}
                </button>
              </div>
            </article>
          ) : (
            <p className="px-6 py-16 text-center text-sm text-muted">Select a lead to read the full brief.</p>
          )}
        </div>
      </div>
    </div>
  );
}
