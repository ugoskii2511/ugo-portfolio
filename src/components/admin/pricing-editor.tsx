"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/site/button";
import { Field, Panel, PanelHeader } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { DEFAULT_DISCLAIMER, PACKAGE_ORDER, PRICE_FLOOR, validatePricingConfig, type PackageKey, type PricingConfig } from "@/lib/pricing";

type Row = { label: string; min: string; max: string };

const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[₦,\s]/g, "")));

/// Admin → Pricing: package ranges, running costs and the disclaimer.
/// Validated here as you type and again on the server (₦150,000 floor).
export function PricingEditor({ initial, disclaimer, customDisclaimer }: { initial: PricingConfig; disclaimer: string; customDisclaimer: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Record<PackageKey, Row>>(
    () =>
      Object.fromEntries(
        PACKAGE_ORDER.map((k) => [k, { label: initial.packages[k].label, min: String(initial.packages[k].min), max: initial.packages[k].max === null ? "" : String(initial.packages[k].max) }])
      ) as Record<PackageKey, Row>
  );
  const [domain, setDomain] = useState({ min: String(initial.domain.min), max: String(initial.domain.max) });
  const [hosting, setHosting] = useState({ min: String(initial.hosting.min), max: String(initial.hosting.max) });
  const [maintenance, setMaintenance] = useState(String(initial.maintenanceFrom));
  const [text, setText] = useState(disclaimer);
  const [busy, setBusy] = useState(false);

  const config: PricingConfig = {
    packages: Object.fromEntries(
      PACKAGE_ORDER.map((k) => [k, { label: rows[k].label, min: toNum(rows[k].min) ?? NaN, max: toNum(rows[k].max), complex: initial.packages[k].complex }])
    ) as PricingConfig["packages"],
    domain: { min: toNum(domain.min) ?? NaN, max: toNum(domain.max) ?? NaN },
    hosting: { min: toNum(hosting.min) ?? NaN, max: toNum(hosting.max) ?? NaN },
    maintenanceFrom: toNum(maintenance) ?? NaN,
  };
  const problems = validatePricingConfig(config);

  async function save() {
    if (problems.length) return toast.error(problems[0]);
    setBusy(true);
    try {
      await adminRequest("/api/admin/pricing", { method: "PUT", body: { config, disclaimer: text.trim() || null } });
      toast.success("Pricing saved. It's live on the site now.");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader title="Development estimates" description={`Shown on /pricing and as the estimate for projects using each package. Minimum ₦${PRICE_FLOOR.toLocaleString("en-NG")}. Leave “to” empty for “From ₦…”.`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Package name</th>
                <th scope="col" className="px-3 py-2.5 font-medium">From (₦)</th>
                <th scope="col" className="px-5 py-2.5 font-medium">To (₦)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PACKAGE_ORDER.map((k) => {
                const r = rows[k];
                const min = toNum(r.min);
                const bad = min === null || Number.isNaN(min) || min < PRICE_FLOOR;
                const update = (patch: Partial<Row>) => setRows((all) => ({ ...all, [k]: { ...all[k], ...patch } }));
                return (
                  <tr key={k}>
                    <td className="px-5 py-2">
                      <input aria-label={`${k} name`} value={r.label} maxLength={80} onChange={(e) => update({ label: e.target.value })} className="field !py-2" />
                    </td>
                    <td className="px-3 py-2">
                      <input aria-label={`${r.label} from`} inputMode="numeric" value={r.min} onChange={(e) => update({ min: e.target.value })} className={`field !py-2 tabular-nums ${bad ? "!border-red-400/60" : ""}`} aria-invalid={bad} />
                    </td>
                    <td className="px-5 py-2">
                      <input aria-label={`${r.label} to`} inputMode="numeric" placeholder="open-ended" value={r.max} onChange={(e) => update({ max: e.target.value })} className="field !py-2 tabular-nums" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Running costs (illustrative)" description="Shown in every cost breakdown. Domain and hosting are per year; maintenance is per month." />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Domain from (₦/yr)" htmlFor="p-dmin">
            <input id="p-dmin" inputMode="numeric" value={domain.min} onChange={(e) => setDomain({ ...domain, min: e.target.value })} className="field" />
          </Field>
          <Field label="Domain to (₦/yr)" htmlFor="p-dmax">
            <input id="p-dmax" inputMode="numeric" value={domain.max} onChange={(e) => setDomain({ ...domain, max: e.target.value })} className="field" />
          </Field>
          <Field label="Hosting from (₦/yr)" htmlFor="p-hmin">
            <input id="p-hmin" inputMode="numeric" value={hosting.min} onChange={(e) => setHosting({ ...hosting, min: e.target.value })} className="field" />
          </Field>
          <Field label="Hosting to (₦/yr)" htmlFor="p-hmax">
            <input id="p-hmax" inputMode="numeric" value={hosting.max} onChange={(e) => setHosting({ ...hosting, max: e.target.value })} className="field" />
          </Field>
          <Field label="Maintenance from (₦/mo)" htmlFor="p-maint">
            <input id="p-maint" inputMode="numeric" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} className="field" />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Pricing disclaimer" description="Shown in full on /work, every case study, /pricing and the enquiry form." />
        <div className="flex flex-col gap-3 p-5">
          <textarea aria-label="Pricing disclaimer" rows={7} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} className="field resize-y text-sm leading-relaxed" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{customDisclaimer ? "Using your custom wording." : "Using the standard wording."}</span>
            <button type="button" onClick={() => setText(DEFAULT_DISCLAIMER)} className="text-accent-bright hover:underline">
              Restore the standard wording
            </button>
          </div>
        </div>
      </Panel>

      {problems.length > 0 && (
        <ul role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <button type="button" onClick={save} disabled={busy || problems.length > 0} className={buttonClass("primary", "md", "w-fit")}>
        {busy ? "Saving…" : "Save pricing"}
      </button>
    </div>
  );
}
