"use client";

import { useId, useState } from "react";
import { clsx } from "clsx";
import { firstYearBudget, formatNaira, formatRange, type PricingConfig } from "@/lib/pricing";

type Estimate = { label: string; min: number; max: number | null; complex: boolean };

/// Illustrative first-year budget for a comparable project. Development is
/// one-time; domain and hosting recur yearly; maintenance is optional and is
/// never folded into the main total.
export function CostEstimator({ config, estimate }: { config: Pick<PricingConfig, "domain" | "hosting" | "maintenanceFrom">; estimate: Estimate }) {
  const id = useId();
  const [choice, setChoice] = useState({ domain: true, hosting: true, maintenance: false });
  const b = firstYearBudget(config, { min: estimate.min, max: estimate.max }, choice);
  const toggle = (key: keyof typeof choice) => setChoice((c) => ({ ...c, [key]: !c[key] }));

  const rows: { key?: keyof typeof choice; label: string; note: string; value: string; kind: string }[] = [
    { label: "Website development", note: `${estimate.label}. Design and build of the agreed scope.`, value: formatRange(estimate.min, estimate.max), kind: "One-time" },
    { key: "domain", label: "Domain registration", note: "Depends on the extension (.com, .com.ng…), registrar and renewal price.", value: formatRange(config.domain.min, config.domain.max), kind: "Per year" },
    {
      key: "hosting",
      label: "Hosting",
      note: estimate.complex
        ? "Larger applications usually need more resources, so hosting may cost more than this typical range."
        : "Typical small business site; depends on provider, traffic and resources.",
      value: formatRange(config.hosting.min, config.hosting.max),
      kind: "Per year",
    },
    {
      key: "maintenance",
      label: "Maintenance (optional)",
      note: "Agreed updates, backups, security checks, bug fixes and support. New features are quoted separately.",
      value: `From ${formatNaira(config.maintenanceFrom)}/month`,
      kind: "Optional · monthly",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {rows.map((row) => {
          const on = row.key ? choice[row.key] : true;
          return (
            <li key={row.label} className={clsx("flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5", !on && "opacity-60")}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {row.key ? (
                    <label className="flex items-center gap-2.5 font-medium">
                      <input type="checkbox" checked={on} onChange={() => toggle(row.key!)} className="h-4 w-4" aria-describedby={`${id}-${row.key}`} />
                      {row.label}
                    </label>
                  ) : (
                    <span className="font-medium">{row.label}</span>
                  )}
                  <span className="rounded-full border border-line px-2 py-0.5 text-[0.68rem] text-muted">{row.kind}</span>
                </div>
                <p id={row.key ? `${id}-${row.key}` : undefined} className="mt-1 text-sm text-muted">
                  {row.note}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums sm:text-right">{row.value}</p>
            </li>
          );
        })}
        <li className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-between sm:gap-6 sm:p-5">
          <div>
            <span className="font-medium">Other third-party services</span>
            <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[0.68rem] text-muted">Only if needed</span>
            <p className="mt-1 text-sm text-muted">Paid APIs, payment gateway fees, SMS/OTP, business email and similar. Priced by the provider; not included below.</p>
          </div>
          <p className="shrink-0 text-sm text-muted sm:text-right">Varies</p>
        </li>
      </ul>

      <dl className="grid gap-3 rounded-2xl border border-line-strong bg-white/[0.02] p-5 text-sm sm:grid-cols-3" aria-live="polite">
        <div>
          <dt className="text-muted">Development (one-time)</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{formatRange(b.development.min, b.development.max)}</dd>
        </div>
        <div>
          <dt className="text-muted">Running costs, first year</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {b.operatingFirstYear.max === 0 ? "₦0 selected" : formatRange(b.operatingFirstYear.min, b.operatingFirstYear.max)}
          </dd>
          <dd className="text-xs text-faint">{[choice.domain && "domain", choice.hosting && "hosting"].filter(Boolean).join(" + ") || "none selected"}, recurring yearly</dd>
        </div>
        <div>
          <dt className="text-muted">Estimated first-year budget</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-accent-bright">{formatRange(b.firstYearTotal.min, b.firstYearTotal.max)}</dd>
          <dd className="text-xs text-faint">Development + selected running costs</dd>
        </div>
        {b.maintenanceYear && b.firstYearWithMaintenance && (
          <div className="border-t border-line pt-3 sm:col-span-3">
            <dt className="text-muted">With optional maintenance (12 months, from {formatNaira(b.maintenanceYear.min)})</dt>
            <dd className="mt-1 font-semibold tabular-nums">{formatRange(b.firstYearWithMaintenance.min, null)}</dd>
          </div>
        )}
      </dl>
      <p className="text-sm leading-relaxed text-muted">
        <strong className="text-fg/90">One-time vs recurring:</strong> development is paid once for the agreed scope. Domain and hosting renew every
        year, maintenance (if you choose it) is monthly, and third-party services are billed by their providers. HTTPS certificates are often
        included free by the hosting provider, so they&apos;re only charged when a paid certificate or security service is genuinely needed.
      </p>
    </div>
  );
}
