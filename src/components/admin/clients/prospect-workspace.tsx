"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Archive, ArrowLeft, Ban, Check, Copy, ExternalLink, Gauge, Globe, RefreshCw, Send, Trash2, X } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { Field, Panel, PanelHeader, StatusPill, formatDate, formatRelative } from "@/components/admin/ui";
import { JobCard, useJobRunner } from "@/components/admin/clients/job-runner";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { formatNaira, INDUSTRIES, QUALIFICATION, TEMPLATE_LABEL, WEBSITE_STATUS } from "@/lib/prospect-meta";

const STAGES = [
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
] as const;

export function stageName(stage: string) {
  const s = stage.toLowerCase().replace(/_/g, " ");
  return s[0].toUpperCase() + s.slice(1);
}

type Finding = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "unavailable";
  priority?: string;
  evidence?: string;
  recommendation?: string;
};

export type ProspectView = {
  id: string;
  businessName: string;
  category: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  websiteStatus: string;
  websiteCheckedAt: string | null;
  websiteEvidence: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  sourceUrl: string | null;
  sourceLicense: string | null;
  discoveredAt: string;
  stage: string;
  priority: number;
  score: number | null;
  scoreBreakdown: { factor: string; points: number; evidence: string }[] | null;
  scoreOverride: number | null;
  qualification: string | null;
  recommendedService: string | null;
  nextAction: string | null;
  scoredAt: string | null;
  proposalAmount: number | null;
  wonAmount: number | null;
  outcomeReason: string | null;
  doNotContact: boolean;
  archived: boolean;
  audits: {
    id: string;
    url: string;
    finalUrl: string | null;
    status: string;
    httpStatus: number | null;
    responseMs: number | null;
    pageBytes: number | null;
    findings: Finding[];
    pagespeed: { available: boolean; reason?: string; scores?: Record<string, number>; metrics?: Record<string, string>; fetchedAt?: string } | null;
    error: string | null;
    createdAt: string;
  }[];
  notes: { id: string; body: string; createdAt: string }[];
  events: { id: string; type: string; channel: string | null; summary: string; createdAt: string }[];
  drafts: { id: string; template: string; channel: string; subject: string | null; body: string; status: string; createdAt: string; sentAt: string | null }[];
  followUps: { id: string; title: string; dueAt: string; status: string }[];
};

/// Shared mutation helper: run the request, toast the result, refresh the
/// server-rendered data.
function useAction() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
      router.refresh();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  }
  return { busy, run };
}

export function ProspectWorkspace({ prospect: p, configured }: { prospect: ProspectView; configured: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { busy, run } = useAction();
  const runner = useJobRunner(() => router.refresh());
  const patch = (body: Record<string, unknown>) => adminRequest(`/api/admin/crm/prospects/${p.id}`, { method: "PATCH", body });
  const [dncOpen, setDncOpen] = useState(false);
  const [dncReason, setDncReason] = useState("");
  const status = WEBSITE_STATUS[p.websiteStatus] ?? WEBSITE_STATUS.UNCHECKED;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/clients/prospects" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Prospects
        </Link>
        <header className="mt-3 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="label-mono">{[p.industry ?? p.category, p.city].filter(Boolean).join(" · ") || "Prospect"}</p>
            <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">{p.businessName}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.doNotContact && <StatusPill tone="danger">Do not contact</StatusPill>}
              {p.archived && <StatusPill>Archived</StatusPill>}
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              {p.qualification && QUALIFICATION[p.qualification] && (
                <StatusPill tone={QUALIFICATION[p.qualification].tone}>{QUALIFICATION[p.qualification].label}</StatusPill>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Stage
              <select
                aria-label="Stage"
                value={p.doNotContact ? "" : p.stage}
                disabled={p.doNotContact || busy !== null}
                onChange={(e) => run("stage", () => patch({ stage: e.target.value }), "Stage updated.")}
                className="field !py-2"
              >
                {p.doNotContact && <option value="">Do not contact</option>}
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {stageName(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Priority
              <select
                aria-label="Priority"
                value={p.priority}
                disabled={busy !== null}
                onChange={(e) => run("priority", () => patch({ priority: Number(e.target.value) }), "Priority updated.")}
                className="field !py-2"
              >
                <option value={0}>Normal</option>
                <option value={1}>High</option>
                <option value={2}>Urgent</option>
              </select>
            </label>
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              disabled={busy !== null}
              onClick={() => run("archive", () => patch({ archived: !p.archived }), p.archived ? "Restored." : "Archived.")}
            >
              <Archive className="h-4 w-4" aria-hidden /> {p.archived ? "Restore" : "Archive"}
            </button>
            {!p.doNotContact && (
              <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setDncOpen((v) => !v)} aria-expanded={dncOpen}>
                <Ban className="h-4 w-4" aria-hidden /> Do not contact
              </button>
            )}
            <button
              type="button"
              className={buttonClass("danger", "sm")}
              disabled={busy !== null}
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${p.businessName}?`,
                  description: "This permanently removes the prospect, its audits, drafts, notes and history. Do-not-contact entries are kept.",
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (!ok) return;
                const done = await run("delete", () => adminRequest(`/api/admin/crm/prospects/${p.id}`, { method: "DELETE" }), "Prospect deleted.");
                if (done) router.push("/admin/clients/prospects");
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete
            </button>
          </div>
        </header>
        {dncOpen && (
          <form
            className="mt-4 flex flex-col gap-3 rounded-xl border border-red-400/30 bg-red-500/5 p-4 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(
                "dnc",
                () => adminRequest(`/api/admin/prospector/prospects/${p.id}/do-not-contact`, { method: "POST", body: { reason: dncReason } }),
                "Marked do-not-contact. Their email, phone and domain are now suppressed."
              );
              if (ok) setDncOpen(false);
            }}
          >
            <Field label="Reason" htmlFor="dnc-reason" className="flex-1" hint="Their email, phone and website domain are added to the never-contact list.">
              <input id="dnc-reason" required maxLength={300} value={dncReason} onChange={(e) => setDncReason(e.target.value)} className="field" placeholder="e.g. Asked not to be contacted" />
            </Field>
            <button type="submit" className={buttonClass("danger", "md")} disabled={busy !== null || !configured}>
              Confirm
            </button>
          </form>
        )}
      </div>

      {!configured && (
        <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          The prospector service isn&apos;t connected, so checks, audits, scoring and drafts can&apos;t run. CRM edits still work.
        </p>
      )}

      {runner.jobs.length > 0 && (
        <div className="flex flex-col gap-3">
          {runner.error && <p className="text-sm text-red-300">{runner.error}</p>}
          {runner.jobs.map((job) => (
            <JobCard key={job.id} job={job} running={runner.running} onRetry={() => runner.resume(job.id, "retry")} onResume={() => runner.resume(job.id)} onCancel={() => runner.stop(job.id)} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <ContactPanel p={p} runner={runner} configured={configured} />
          <ScorePanel p={p} configured={configured} />
          <AuditPanel p={p} runner={runner} configured={configured} />
        </div>
        <div className="flex flex-col gap-6">
          <DraftsPanel p={p} configured={configured} />
          <FollowUpsPanel p={p} />
          <DealPanel p={p} />
          <ActivityPanel p={p} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-faint">—</span>}</dd>
    </div>
  );
}

function ContactPanel({ p, runner, configured }: { p: ProspectView; runner: ReturnType<typeof useJobRunner>; configured: boolean }) {
  const [editing, setEditing] = useState(false);
  const { busy, run } = useAction();
  const id = useId();
  const [values, setValues] = useState({
    businessName: p.businessName,
    website: p.website ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    industry: p.industry ?? "",
    city: p.city ?? "",
  });
  const status = WEBSITE_STATUS[p.websiteStatus] ?? WEBSITE_STATUS.UNCHECKED;

  return (
    <Panel>
      <PanelHeader
        title="Contact & website"
        action={
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs text-accent-bright hover:underline">
            {editing ? "Cancel" : "Edit"}
          </button>
        }
      />
      {editing ? (
        <form
          className="grid gap-4 p-5 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = {
              businessName: values.businessName,
              website: values.website.trim() || null,
              email: values.email.trim() || null,
              phone: values.phone.trim() || null,
              industry: values.industry || null,
              city: values.city.trim() || null,
            };
            if (await run("contact", () => adminRequest(`/api/admin/crm/prospects/${p.id}`, { method: "PATCH", body }), "Saved.")) setEditing(false);
          }}
        >
          <Field label="Business name" htmlFor={`${id}-n`} className="sm:col-span-2">
            <input id={`${id}-n`} required maxLength={200} value={values.businessName} onChange={(e) => setValues({ ...values, businessName: e.target.value })} className="field" />
          </Field>
          <Field label="Website" htmlFor={`${id}-w`} hint="Changing it resets the website check.">
            <input id={`${id}-w`} type="url" value={values.website} onChange={(e) => setValues({ ...values, website: e.target.value })} className="field" />
          </Field>
          <Field label="Industry" htmlFor={`${id}-i`}>
            <select id={`${id}-i`} value={values.industry} onChange={(e) => setValues({ ...values, industry: e.target.value })} className="field">
              <option value="">Not set</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Email" htmlFor={`${id}-e`}>
            <input id={`${id}-e`} type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} className="field" />
          </Field>
          <Field label="Phone" htmlFor={`${id}-p`}>
            <input id={`${id}-p`} value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} className="field" />
          </Field>
          <Field label="City" htmlFor={`${id}-c`}>
            <input id={`${id}-c`} value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} className="field" />
          </Field>
          <button type="submit" disabled={busy !== null} className={buttonClass("primary", "sm", "w-fit self-end")}>
            Save
          </button>
        </form>
      ) : (
        <div className="px-5 py-3">
          <dl className="divide-y divide-line">
            <Row label="Website">
              {p.website ? (
                <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-accent-bright hover:underline">
                  {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
            </Row>
            <Row label="Status">
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              {p.websiteEvidence && <p className="mt-1 text-xs text-muted">{p.websiteEvidence}</p>}
              {p.websiteCheckedAt && <p className="mt-0.5 text-xs text-faint">Checked {formatRelative(p.websiteCheckedAt)}</p>}
            </Row>
            <Row label="Email">{p.email ? <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a> : null}</Row>
            <Row label="Phone">{p.phone ? <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a> : null}</Row>
            <Row label="Address">{[p.address, p.city, p.state, p.country].filter(Boolean).join(", ") || null}</Row>
            <Row label="Source">
              <span className="capitalize">{p.source}</span>
              {p.sourceUrl && (
                <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-accent-bright hover:underline">
                  View listing
                </a>
              )}
              {p.sourceLicense && <p className="text-xs text-faint">{p.sourceLicense}</p>}
              <p className="text-xs text-faint">Added {formatDate(p.discoveredAt)}</p>
            </Row>
          </dl>
          <div className="flex flex-wrap gap-2 pb-2 pt-3">
            <button
              type="button"
              disabled={!configured || runner.running}
              onClick={() => runner.start("verify", { prospectIds: [p.id] })}
              className={buttonClass("secondary", "sm")}
            >
              <Globe className="h-4 w-4" aria-hidden /> {p.website ? "Re-check website" : "Look for a website"}
            </button>
            {p.website && (
              <button
                type="button"
                disabled={!configured || runner.running}
                onClick={() => runner.start("audit", { prospectIds: [p.id] })}
                className={buttonClass("secondary", "sm")}
              >
                <Gauge className="h-4 w-4" aria-hidden /> Run website audit
              </button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function ScorePanel({ p, configured }: { p: ProspectView; configured: boolean }) {
  const { busy, run } = useAction();
  const [override, setOverride] = useState(p.scoreOverride === null ? "" : String(p.scoreOverride));
  const shown = p.scoreOverride ?? p.score;
  return (
    <Panel>
      <PanelHeader
        title="Lead score"
        description={p.scoredAt ? `Scored ${formatRelative(p.scoredAt)} from your scoring rules.` : "Not scored yet."}
        action={
          <button
            type="button"
            disabled={!configured || busy !== null}
            onClick={() => run("score", () => adminRequest(`/api/admin/prospector/prospects/${p.id}/score`, { method: "POST" }), "Rescored.")}
            className={buttonClass("ghost", "sm", "!px-3")}
          >
            <RefreshCw className={clsx("h-4 w-4", busy === "score" && "animate-spin")} aria-hidden /> Rescore
          </button>
        }
      />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline gap-3">
          <p className="font-mono text-4xl font-semibold tabular-nums">{shown ?? "—"}</p>
          {p.scoreOverride !== null && <p className="text-xs text-muted">Manual override (calculated: {p.score ?? "—"})</p>}
        </div>
        {p.recommendedService && (
          <p className="text-sm">
            <span className="text-muted">Recommended service:</span> {p.recommendedService}
          </p>
        )}
        {p.nextAction && (
          <p className="text-sm">
            <span className="text-muted">Next action:</span> {p.nextAction}
          </p>
        )}
        {p.scoreBreakdown && p.scoreBreakdown.length > 0 && (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {p.scoreBreakdown.map((f, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block">{f.factor}</span>
                  <span className="block text-xs text-muted">{f.evidence}</span>
                </span>
                <span className={clsx("shrink-0 font-mono", f.points > 0 ? "text-emerald-300" : f.points < 0 ? "text-red-300" : "text-muted")}>
                  {f.points > 0 ? "+" : ""}
                  {f.points}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run("override", () => adminRequest(`/api/admin/crm/prospects/${p.id}`, { method: "PATCH", body: { scoreOverride: override === "" ? null : Number(override) } }), "Score override saved.");
          }}
        >
          <Field label="Override score" htmlFor="score-override" hint="Leave empty to use the calculated score.">
            <input id="score-override" type="number" min={0} max={100} value={override} onChange={(e) => setOverride(e.target.value)} className="field w-32" />
          </Field>
          <button type="submit" disabled={busy !== null} className={buttonClass("secondary", "sm", "mb-6")}>
            Save
          </button>
        </form>
      </div>
    </Panel>
  );
}

const FINDING_TONE = { pass: "success", warn: "warning", fail: "danger", unavailable: "neutral" } as const;

function AuditPanel({ p, runner, configured }: { p: ProspectView; runner: ReturnType<typeof useJobRunner>; configured: boolean }) {
  const audit = p.audits[0];
  if (!audit) {
    return (
      <Panel>
        <PanelHeader title="Website audit" />
        <p className="px-5 py-6 text-sm text-muted">
          {p.website ? "No audit yet. Run one to check speed, mobile layout, SEO basics and contact options." : "No website to audit."}
        </p>
        {p.website && (
          <div className="px-5 pb-5">
            <button type="button" disabled={!configured || runner.running} onClick={() => runner.start("audit", { prospectIds: [p.id] })} className={buttonClass("primary", "sm")}>
              <Gauge className="h-4 w-4" aria-hidden /> Run website audit
            </button>
          </div>
        )}
      </Panel>
    );
  }
  const order = { fail: 0, warn: 1, unavailable: 2, pass: 3 };
  const findings = [...(audit.findings ?? [])].sort((a, b) => order[a.status] - order[b.status]);
  const problems = findings.filter((f) => f.status === "fail" || f.status === "warn").length;
  return (
    <Panel>
      <PanelHeader
        title="Website audit"
        description={`${audit.status === "completed" ? "Completed" : audit.status === "partial" ? "Partial" : "Failed"} ${formatRelative(audit.createdAt)} · ${problems} issue${problems === 1 ? "" : "s"}`}
      />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span>HTTP {audit.httpStatus ?? "—"}</span>
          <span>{audit.responseMs !== null ? `${audit.responseMs} ms response` : "No response time"}</span>
          <span>{audit.pageBytes !== null ? `${Math.round(audit.pageBytes / 1024)} KB HTML` : ""}</span>
          {audit.finalUrl && audit.finalUrl !== audit.url && <span>Redirected to {audit.finalUrl}</span>}
        </div>
        {audit.error && <p className="text-sm text-amber-300">{audit.error}</p>}
        {audit.pagespeed && (
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs font-medium">Google PageSpeed (mobile)</p>
            {audit.pagespeed.available ? (
              <>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(audit.pagespeed.scores ?? {}).map(([k, v]) => (
                    <StatusPill key={k} tone={v >= 90 ? "success" : v >= 50 ? "warning" : "danger"}>
                      {k.replace(/-/g, " ")} {v}
                    </StatusPill>
                  ))}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(audit.pagespeed.metrics ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted">Not available: {audit.pagespeed.reason}</p>
            )}
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {findings.map((f) => (
            <li key={f.key} className="rounded-xl border border-line px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{f.label}</p>
                <StatusPill tone={FINDING_TONE[f.status]}>{f.status === "unavailable" ? "not checked" : f.status}</StatusPill>
              </div>
              {f.evidence && <p className="mt-1 text-xs text-muted">{f.evidence}</p>}
              {f.recommendation && f.status !== "pass" && <p className="mt-1 text-xs text-fg/80">→ {f.recommendation}</p>}
            </li>
          ))}
        </ul>
        <button type="button" disabled={!configured || runner.running} onClick={() => runner.start("audit", { prospectIds: [p.id] })} className={buttonClass("secondary", "sm", "w-fit")}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Run again
        </button>
      </div>
    </Panel>
  );
}

const DRAFT_TONE = { draft: "accent", approved: "success", rejected: "neutral", sent: "success" } as const;

function DraftsPanel({ p, configured }: { p: ProspectView; configured: boolean }) {
  const { busy, run } = useAction();
  const [template, setTemplate] = useState("");
  return (
    <Panel>
      <PanelHeader title="Outreach drafts" description="Built only from facts recorded above. Review, approve, send it yourself, then log it." />
      <div className="flex flex-col gap-4 p-5">
        {p.doNotContact ? (
          <p className="text-sm text-red-300">This business is on the do-not-contact list. No new drafts can be created.</p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run("generate", () => adminRequest(`/api/admin/prospector/prospects/${p.id}/drafts`, { method: "POST", body: { template: template || null } }), "Draft created.");
            }}
          >
            <Field label="Template" htmlFor="draft-template">
              <select id="draft-template" value={template} onChange={(e) => setTemplate(e.target.value)} className="field">
                <option value="">Best fit (automatic)</option>
                {Object.entries(TEMPLATE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" disabled={!configured || busy !== null} className={buttonClass("primary", "sm", "mb-px")}>
              Generate draft
            </button>
          </form>
        )}
        {p.drafts.length === 0 ? (
          <p className="text-sm text-muted">No drafts yet.</p>
        ) : (
          p.drafts.map((d) => <DraftCard key={d.id} draft={d} prospect={p} configured={configured} />)
        )}
      </div>
    </Panel>
  );
}

export function DraftCard({
  draft: d,
  prospect,
  configured,
  showProspect = false,
}: {
  draft: ProspectView["drafts"][number];
  prospect: Pick<ProspectView, "id" | "businessName" | "email" | "phone" | "doNotContact">;
  configured: boolean;
  showProspect?: boolean;
}) {
  const toast = useToast();
  const { busy, run } = useAction();
  const [subject, setSubject] = useState(d.subject ?? "");
  const [body, setBody] = useState(d.body);
  const [channel, setChannel] = useState(d.channel);
  const editable = d.status === "draft" || d.status === "approved";
  const dirty = subject !== (d.subject ?? "") || body !== d.body;
  const patch = (payload: Record<string, unknown>, message: string) =>
    run(`draft-${d.id}`, () => adminRequest(`/api/admin/crm/drafts/${d.id}`, { method: "PATCH", body: payload }), message);
  const fullText = `${d.subject ? `Subject: ${subject}\n\n` : ""}${body}`;
  const phoneDigits = prospect.phone?.replace(/\D/g, "").replace(/^0/, "234");

  return (
    <article className="rounded-xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {showProspect && (
            <Link href={`/admin/clients/prospects/${prospect.id}`} className="truncate text-sm font-medium hover:text-accent-bright">
              {prospect.businessName}
            </Link>
          )}
          <span className="text-xs text-muted">
            {TEMPLATE_LABEL[d.template] ?? d.template} · {d.channel}
          </span>
        </div>
        <StatusPill tone={DRAFT_TONE[d.status as keyof typeof DRAFT_TONE] ?? "neutral"}>{d.status}</StatusPill>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {d.subject !== null && (
          <input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} readOnly={!editable} maxLength={200} className="field !py-2 text-sm" />
        )}
        <textarea aria-label="Message" value={body} onChange={(e) => setBody(e.target.value)} readOnly={!editable} rows={8} maxLength={8000} className="field text-sm leading-relaxed" />
        {d.sentAt && <p className="text-xs text-muted">Logged as sent {formatDate(d.sentAt, { dateStyle: "medium", timeStyle: "short" })}</p>}
        <div className="flex flex-wrap gap-2">
          {editable && dirty && (
            <button type="button" disabled={busy !== null} onClick={() => patch({ subject: d.subject !== null ? subject : undefined, body }, d.status === "approved" ? "Saved. Approve it again before sending." : "Saved.")} className={buttonClass("secondary", "sm")}>
              Save edits
            </button>
          )}
          {d.status === "draft" && !dirty && (
            <button type="button" disabled={busy !== null || prospect.doNotContact} onClick={() => patch({ action: "approve" }, "Approved.")} className={buttonClass("primary", "sm")}>
              <Check className="h-4 w-4" aria-hidden /> Approve
            </button>
          )}
          {(d.status === "draft" || d.status === "approved") && (
            <button type="button" disabled={busy !== null} onClick={() => patch({ action: "reject" }, "Rejected.")} className={buttonClass("ghost", "sm", "!px-3")}>
              <X className="h-4 w-4" aria-hidden /> Reject
            </button>
          )}
          {d.status === "rejected" && (
            <button type="button" disabled={busy !== null} onClick={() => patch({ action: "reopen" }, "Reopened.")} className={buttonClass("secondary", "sm")}>
              Reopen
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fullText);
                toast.success("Copied to clipboard.");
              } catch {
                toast.error("Couldn't copy. Select the text and copy it manually.");
              }
            }}
            className={buttonClass("ghost", "sm", "!px-3")}
          >
            <Copy className="h-4 w-4" aria-hidden /> Copy
          </button>
        </div>
        {d.status === "approved" && !dirty && (
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-white/[0.02] p-3">
            <p className="text-xs text-muted">Send it yourself, then log it here. Logging schedules the follow-up reminders.</p>
            <div className="flex flex-wrap items-center gap-2">
              {prospect.email && channel === "email" && (
                <a href={`mailto:${prospect.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} className={buttonClass("secondary", "sm")}>
                  Open in email app
                </a>
              )}
              {phoneDigits && channel === "whatsapp" && (
                <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                  Open in WhatsApp
                </a>
              )}
              <select aria-label="Sent via" value={channel} onChange={(e) => setChannel(e.target.value)} className="field !w-auto !py-1.5 text-sm">
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone</option>
                <option value="other">Other</option>
              </select>
              <button
                type="button"
                disabled={!configured || busy !== null || prospect.doNotContact}
                onClick={() => run(`sent-${d.id}`, () => adminRequest(`/api/admin/prospector/drafts/${d.id}/sent`, { method: "POST", body: { channel } }), "Logged as sent. Follow-ups scheduled.")}
                className={buttonClass("primary", "sm")}
              >
                <Send className="h-4 w-4" aria-hidden /> I sent it
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function FollowUpsPanel({ p }: { p: ProspectView }) {
  const { busy, run } = useAction();
  const [title, setTitle] = useState("Follow up");
  const [due, setDue] = useState("");
  const open = p.followUps.filter((f) => f.status === "open");
  const closed = p.followUps.filter((f) => f.status !== "open");
  const [now] = useState(() => Date.now());
  return (
    <Panel>
      <PanelHeader title="Follow-ups" description="Created automatically when you log outreach; stopped when they reply." />
      <div className="flex flex-col gap-3 p-5">
        {open.length === 0 && <p className="text-sm text-muted">No open follow-ups.</p>}
        {open.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
            <div>
              <p className="text-sm">{f.title}</p>
              <p className={clsx("text-xs", new Date(f.dueAt).getTime() < now ? "text-red-300" : "text-muted")}>Due {formatDate(f.dueAt)}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" disabled={busy !== null} onClick={() => run(`f-${f.id}`, () => adminRequest(`/api/admin/crm/followups/${f.id}`, { method: "PATCH", body: { status: "done" } }), "Done.")} className={buttonClass("secondary", "sm")}>
                Done
              </button>
              <button type="button" disabled={busy !== null} onClick={() => run(`f-${f.id}`, () => adminRequest(`/api/admin/crm/followups/${f.id}`, { method: "PATCH", body: { status: "skipped" } }), "Skipped.")} className={buttonClass("ghost", "sm", "!px-3")}>
                Skip
              </button>
            </div>
          </div>
        ))}
        {closed.length > 0 && <p className="text-xs text-faint">{closed.length} completed or skipped.</p>}
        <form
          className="flex flex-wrap items-end gap-2 border-t border-line pt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(
              "followup",
              () => adminRequest(`/api/admin/crm/prospects/${p.id}/followups`, { method: "POST", body: { title, dueAt: new Date(`${due}T09:00:00`).toISOString() } }),
              "Follow-up added."
            );
            if (ok) setDue("");
          }}
        >
          <Field label="Reminder" htmlFor="fu-title" className="flex-1">
            <input id="fu-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
          </Field>
          <Field label="Due" htmlFor="fu-due">
            <input id="fu-due" type="date" required value={due} onChange={(e) => setDue(e.target.value)} className="field" />
          </Field>
          <button type="submit" disabled={busy !== null} className={buttonClass("secondary", "sm", "mb-px")}>
            Add
          </button>
        </form>
      </div>
    </Panel>
  );
}

function DealPanel({ p }: { p: ProspectView }) {
  const { busy, run } = useAction();
  const [proposal, setProposal] = useState(p.proposalAmount?.toString() ?? "");
  const [won, setWon] = useState(p.wonAmount?.toString() ?? "");
  const [reason, setReason] = useState(p.outcomeReason ?? "");
  const num = (v: string) => (v.trim() === "" ? null : Math.round(Number(v)));
  return (
    <Panel>
      <PanelHeader title="Deal" description={`Proposal ${formatNaira(p.proposalAmount)} · Won ${formatNaira(p.wonAmount)}`} />
      <form
        className="grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run("deal", () => adminRequest(`/api/admin/crm/prospects/${p.id}`, { method: "PATCH", body: { proposalAmount: num(proposal), wonAmount: num(won), outcomeReason: reason.trim() || null } }), "Deal saved.");
        }}
      >
        <Field label="Proposal amount (₦)" htmlFor="deal-proposal">
          <input id="deal-proposal" type="number" min={0} value={proposal} onChange={(e) => setProposal(e.target.value)} className="field" />
        </Field>
        <Field label="Won amount (₦)" htmlFor="deal-won">
          <input id="deal-won" type="number" min={0} value={won} onChange={(e) => setWon(e.target.value)} className="field" />
        </Field>
        <Field label="Outcome notes" htmlFor="deal-reason" className="sm:col-span-2" hint="Why it was won or lost.">
          <input id="deal-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="field" />
        </Field>
        <button type="submit" disabled={busy !== null} className={buttonClass("secondary", "sm", "w-fit")}>
          Save deal
        </button>
      </form>
    </Panel>
  );
}

function ActivityPanel({ p }: { p: ProspectView }) {
  const { busy, run } = useAction();
  const [mode, setMode] = useState<"note" | "interaction">("note");
  const [note, setNote] = useState("");
  const [type, setType] = useState("reply");
  const [channel, setChannel] = useState("email");
  const [summary, setSummary] = useState("");

  const timeline = [
    ...p.notes.map((n) => ({ id: `n-${n.id}`, at: n.createdAt, label: "Note", text: n.body })),
    ...p.events.map((e) => ({ id: `e-${e.id}`, at: e.createdAt, label: stageName(e.type), text: e.summary + (e.channel ? ` (${e.channel})` : "") })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Panel>
      <PanelHeader title="Notes & activity" />
      <div className="flex flex-col gap-4 p-5">
        <div role="group" aria-label="Add" className="flex gap-2 text-xs">
          {(["note", "interaction"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={clsx("rounded-full border px-3 py-1", mode === m ? "border-accent text-accent-bright" : "border-line text-muted")}>
              {m === "note" ? "Add note" : "Log interaction"}
            </button>
          ))}
        </div>
        {mode === "note" ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run("note", () => adminRequest(`/api/admin/crm/prospects/${p.id}/activity`, { method: "POST", body: { kind: "note", body: note } }), "Note added.")) setNote("");
            }}
          >
            <textarea aria-label="Note" required maxLength={5000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="field text-sm" />
            <button type="submit" disabled={busy !== null} className={buttonClass("secondary", "sm", "w-fit")}>
              Save note
            </button>
          </form>
        ) : (
          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run("interaction", () => adminRequest(`/api/admin/crm/prospects/${p.id}/activity`, { method: "POST", body: { kind: "interaction", type, channel, summary } }), "Logged.")) setSummary("");
            }}
          >
            <select aria-label="Interaction type" value={type} onChange={(e) => setType(e.target.value)} className="field">
              <option value="reply">They replied</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="proposal">Proposal sent</option>
              <option value="message">Message</option>
              <option value="other">Other</option>
            </select>
            <select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="field">
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
              <option value="in_person">In person</option>
              <option value="other">Other</option>
            </select>
            <input aria-label="Summary" required maxLength={500} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What happened?" className="field sm:col-span-2" />
            <button type="submit" disabled={busy !== null} className={buttonClass("secondary", "sm", "w-fit")}>
              Log it
            </button>
          </form>
        )}
        <ol className="flex flex-col gap-3 border-t border-line pt-4">
          {timeline.length === 0 && <li className="text-sm text-muted">No activity yet.</li>}
          {timeline.map((item) => (
            <li key={item.id} className="text-sm">
              <p className="text-xs text-faint">
                {item.label} · {formatDate(item.at, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="whitespace-pre-wrap">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}
