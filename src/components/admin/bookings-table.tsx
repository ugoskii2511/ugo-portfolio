"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Search } from "lucide-react";

export type AdminBooking = {
  id: string;
  clientName: string;
  budget: string;
  projectType: string;
  details: string;
  whatsappUrl: string;
  createdAt: string;
};

function toCsvValue(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsv(bookings: AdminBooking[]) {
  const header = ["Client", "Budget", "Project Type", "Details", "Submitted"];
  const rows = bookings.map((b) => [
    b.clientName,
    b.budget,
    b.projectType,
    b.details,
    new Date(b.createdAt).toISOString(),
  ]);
  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `booking-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function BookingsTable({ bookings }: { bookings: AdminBooking[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.clientName.toLowerCase().includes(q) ||
        b.projectType.toLowerCase().includes(q) ||
        b.budget.toLowerCase().includes(q)
    );
  }, [bookings, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-full border border-border-subtle bg-surface py-2 pl-9 pr-3.5 text-sm outline-none ring-primary/40 transition focus:ring-2"
          />
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          disabled={bookings.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-4 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No booking leads yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No leads match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="glass-panel overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-foreground/60">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Project Type</th>
                <th className="px-5 py-3 font-medium">Details</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
                <th className="px-5 py-3 font-medium">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-border-subtle transition-colors last:border-0 hover:bg-primary-soft/40"
                >
                  <td className="px-5 py-4 font-medium">{booking.clientName}</td>
                  <td className="px-5 py-4">{booking.budget}</td>
                  <td className="px-5 py-4">{booking.projectType}</td>
                  <td className="max-w-xs px-5 py-4 text-foreground/70">
                    <p className="line-clamp-2">{booking.details}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-foreground/60">
                    {new Date(booking.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={booking.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-dark"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
