"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { Panel, PanelHeader } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { EXPENSE_CATEGORIES, lagosToday } from "@/lib/business-calc";
import { formatKobo, koboToInput, parseNairaToKobo, sumKobo } from "@/lib/money";

type Line = { key: number; label: string; amount: string; category: string };

let nextKey = 1;
const newLine = (label = "", amount = ""): Line => ({ key: nextKey++, label, amount, category: "other" });

/// Quick sums that don't touch the database unless you choose to save them.
/// Totals are added in kobo, so ₦0.10 + ₦0.20 is exactly ₦0.30.
export function ExpenseCalculator() {
  const router = useRouter();
  const toast = useToast();
  const [lines, setLines] = useState<Line[]>(() => [newLine(), newLine(), newLine()]);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [today] = useState(() => lagosToday());
  const [date, setDate] = useState(today);
  const [singleName, setSingleName] = useState("");
  const [singleCategory, setSingleCategory] = useState("other");

  const parsed = lines.map((l) => ({ ...l, kobo: parseNairaToKobo(l.amount) }));
  const valid = parsed.filter((l) => l.kobo !== null && l.kobo > 0);
  const invalid = parsed.filter((l) => l.amount.trim() !== "" && l.kobo === null);
  const total = sumKobo(valid.map((l) => l.kobo!));
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function clear() {
    setLines([newLine(), newLine(), newLine()]);
    setSingleName("");
    setRequestId(crypto.randomUUID());
  }

  async function save(mode: "single" | "separate") {
    if (valid.length === 0) return toast.error("Enter at least one amount first.");
    if (invalid.length) return toast.error("Fix the highlighted amounts first.");
    const base = { spentOn: date, notes: null, method: null, projectId: null, clientId: null };
    const items =
      mode === "single"
        ? [{ ...base, name: singleName.trim() || valid.map((l) => l.label || "Item").join(" + ").slice(0, 200), amount: koboToInput(total), category: singleCategory, notes: valid.map((l) => `${l.label || "Item"}: ${formatKobo(l.kobo)}`).join("\n").slice(0, 2000) }]
        : valid.map((l) => ({ ...base, name: l.label.trim() || "Expense", amount: l.amount, category: l.category }));
    setBusy(true);
    try {
      await adminRequest("/api/admin/business/expenses", { method: "POST", body: { items, clientRequestId: requestId } });
      toast.success(mode === "single" ? `Saved as one expense of ${formatKobo(total)}.` : `Saved ${items.length} expenses totalling ${formatKobo(total)}.`);
      clear();
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Expense calculator" description="Add up costs instantly. Nothing is saved unless you click a Save button." />
      <div className="flex flex-col gap-4 p-5">
        <ul className="flex flex-col gap-2">
          {parsed.map((l, i) => {
            const bad = l.amount.trim() !== "" && l.kobo === null;
            return (
              <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_7.5rem_2.25rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_9.5rem_2.25rem]">
                <input aria-label={`Item ${i + 1} name`} value={l.label} onChange={(e) => update(l.key, { label: e.target.value })} maxLength={120} placeholder={["Domain", "Hosting", "Software"][i] ?? "Item"} className="field col-start-1 row-start-1 !py-2 text-sm" />
                <div className="relative col-start-2 row-start-1">
                  <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                    ₦
                  </span>
                  <input
                    aria-label={`Item ${i + 1} amount`}
                    aria-invalid={bad}
                    inputMode="decimal"
                    value={l.amount}
                    onChange={(e) => update(l.key, { amount: e.target.value })}
                    placeholder="0"
                    className={`field !py-2 !pl-7 text-sm tabular-nums ${bad ? "!border-red-400/60" : ""}`}
                  />
                </div>
                <select aria-label={`Item ${i + 1} category`} value={l.category} onChange={(e) => update(l.key, { category: e.target.value })} className="field col-span-3 col-start-1 row-start-2 !py-2 text-sm sm:col-span-1 sm:col-start-3 sm:row-start-1">
                  {Object.entries(EXPENSE_CATEGORIES).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Remove item ${i + 1}`}
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [newLine()]))}
                  className="col-start-3 row-start-1 flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-white/[0.05] hover:text-fg sm:col-start-4"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])} disabled={lines.length >= 50} className={buttonClass("ghost", "sm", "!px-3")}>
            <Plus className="h-4 w-4" aria-hidden /> Add line
          </button>
          <div className="text-right" aria-live="polite">
            <p className="text-xs text-muted">
              Total of {valid.length} item{valid.length === 1 ? "" : "s"}
              {invalid.length ? ` · ${invalid.length} need fixing` : ""}
            </p>
            <p className="flex items-center justify-end gap-2 text-2xl font-semibold tabular-nums tracking-tight">
              <Calculator className="h-5 w-5 text-accent-bright" aria-hidden /> {formatKobo(total)}
            </p>
          </div>
        </div>
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium">Save these as expenses</summary>
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm sm:max-w-xs">
              <span className="text-[0.8rem] font-medium text-fg/90">Date spent</span>
              <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="field" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <p className="text-sm font-medium">As one expense</p>
                <input aria-label="Name for the combined expense" value={singleName} onChange={(e) => setSingleName(e.target.value)} maxLength={200} placeholder="e.g. Client site setup costs" className="field !py-2 text-sm" />
                <select aria-label="Category for the combined expense" value={singleCategory} onChange={(e) => setSingleCategory(e.target.value)} className="field !py-2 text-sm">
                  {Object.entries(EXPENSE_CATEGORIES).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <button type="button" disabled={busy || total === 0} onClick={() => save("single")} className={buttonClass("secondary", "sm", "w-fit")}>
                  Save 1 expense ({formatKobo(total)})
                </button>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <p className="text-sm font-medium">As separate expenses</p>
                <p className="text-xs text-muted">Each line becomes its own record with its own category.</p>
                <button type="button" disabled={busy || valid.length === 0} onClick={() => save("separate")} className={buttonClass("secondary", "sm", "mt-auto w-fit")}>
                  Save {valid.length} expense{valid.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
        </details>
        <button type="button" onClick={clear} className={buttonClass("ghost", "sm", "w-fit !px-3")}>
          Clear calculator
        </button>
      </div>
    </Panel>
  );
}
