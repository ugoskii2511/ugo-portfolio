"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useToast } from "@/components/admin/toast-provider";
import { formatDate } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { formatNaira } from "@/lib/prospect-meta";
import { stageName } from "@/components/admin/clients/prospect-workspace";

const COLUMNS = [
  "DISCOVERED",
  "NEEDS_REVIEW",
  "QUALIFIED",
  "READY_FOR_OUTREACH",
  "CONTACTED",
  "REPLIED",
  "CONSULTATION_SCHEDULED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

type Card = {
  id: string;
  businessName: string;
  city: string | null;
  industry: string | null;
  stage: string;
  score: number | null;
  priority: number;
  followUpAt: string | null;
  proposalAmount: number | null;
};

const PER_COLUMN = 40;

export function PipelineBoard({ prospects }: { prospects: Card[] }) {
  const router = useRouter();
  const toast = useToast();
  // Optimistic stage moves; reverted if the request fails.
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [hideEarly, setHideEarly] = useState(false);
  const cards = prospects.map((p) => ({ ...p, stage: moved[p.id] ?? p.stage }));
  const columns = hideEarly ? COLUMNS.slice(3) : COLUMNS;

  async function move(id: string, stage: string) {
    setMoved((m) => ({ ...m, [id]: stage }));
    try {
      await adminRequest(`/api/admin/crm/prospects/${id}`, { method: "PATCH", body: { stage } });
      toast.success(`Moved to ${stageName(stage)}.`);
      router.refresh();
    } catch (err) {
      setMoved((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 self-start text-sm text-muted">
        <input type="checkbox" checked={hideEarly} onChange={(e) => setHideEarly(e.target.checked)} className="h-4 w-4" />
        Hide discovered / needs review / qualified
      </label>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3">
          {columns.map((stage) => {
            const list = cards.filter((c) => c.stage === stage);
            return (
              <section key={stage} aria-label={stageName(stage)} className="flex w-64 shrink-0 flex-col rounded-2xl border border-line bg-raised">
                <header className="flex items-center justify-between border-b border-line px-3 py-2">
                  <h2 className="text-xs font-semibold">{stageName(stage)}</h2>
                  <span className="font-mono text-[0.65rem] text-faint">{list.length}</span>
                </header>
                <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
                  {list.slice(0, PER_COLUMN).map((c) => (
                    <li key={c.id} className="rounded-xl border border-line bg-canvas p-2.5">
                      <Link href={`/admin/clients/prospects/${c.id}`} className="block text-sm font-medium leading-snug hover:text-accent-bright">
                        {c.priority > 0 && <span className="mr-1 text-amber-300" aria-label="High priority">●</span>}
                        {c.businessName}
                      </Link>
                      <p className="mt-0.5 text-[0.7rem] text-muted">{[c.industry, c.city].filter(Boolean).join(" · ") || "—"}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 text-[0.7rem] text-faint">
                        {c.score !== null && <span>Score {c.score}</span>}
                        {c.proposalAmount !== null && <span>{formatNaira(c.proposalAmount)}</span>}
                        {c.followUpAt && (
                          <span className={clsx(new Date(c.followUpAt).getTime() < Date.now() && "text-red-300")}>Follow up {formatDate(c.followUpAt, { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                      <select
                        aria-label={`Stage for ${c.businessName}`}
                        value={c.stage}
                        onChange={(e) => move(c.id, e.target.value)}
                        className="field mt-2 !py-1 text-xs"
                      >
                        {COLUMNS.map((s) => (
                          <option key={s} value={s}>
                            {stageName(s)}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                  {list.length > PER_COLUMN && (
                    <li>
                      <Link href={`/admin/clients/prospects?stage=${stage}`} className="block px-1 py-1 text-xs text-accent-bright hover:underline">
                        +{list.length - PER_COLUMN} more
                      </Link>
                    </li>
                  )}
                  {list.length === 0 && <li className="px-1 py-2 text-xs text-faint">Empty</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
