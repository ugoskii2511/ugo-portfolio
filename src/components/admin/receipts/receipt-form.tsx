"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, Eye, FileCheck2, Info } from "lucide-react";
import { Field, Panel, PanelHeader } from "@/components/admin/ui";
import { MoneyInput, PaymentStatusPill } from "@/components/admin/business/bits";
import { PAYMENT_DESCRIPTIONS, SERVICE_TYPES } from "@/components/admin/business/forms";
import { buttonClass } from "@/components/site/button";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/admin/toast-provider";
import { ReceiptDocument } from "@/components/admin/receipts/receipt-document";
import { AdminRequestError, adminRequest, errorMessage } from "@/lib/admin-fetch";
import { agreedTotalKobo, lagosToday, PAYMENT_METHODS, paymentStatus, PAYMENT_STATUS_LABEL } from "@/lib/business-calc";
import { defaultPaymentDescription, formatMinor, type ReceiptSnapshot } from "@/lib/receipt-calc";
import { parseNairaToKobo } from "@/lib/money";
import type { ReceiptFormClient } from "@/lib/receipts-data";

export type ExistingPayment = {
  id: string;
  clientName: string;
  projectTitle: string | null;
  amountKobo: number;
  paidOn: string;
  methodLabel: string;
  description: string | null;
};

type Project = ReceiptFormClient["projects"][number];

function isFullyPaid(p: Project | undefined | null): boolean {
  return !!p && p.recorded.length > 0 && p.totalKobo !== null && p.totalKobo > 0 && (p.paymentStatus === "PAID" || p.paymentStatus === "OVERPAID");
}

/// The payment most likely wanted: the newest without a receipt, else the newest.
function defaultRecorded(p: Project | undefined | null): string {
  const list = p?.recorded ?? [];
  return (list.find((r) => !r.receipt) ?? list[0])?.id ?? "";
}

type Business = { businessName: string; email: string | null; phone: string | null; website: string | null; address: string | null; currencySymbol: string };

function Choice({ value, current, onChange, children, name }: { value: string; current: string; onChange: (v: string) => void; children: ReactNode; name: string }) {
  return (
    <label className={clsx("flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors", current === value ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-muted hover:text-fg")}>
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(value)} className="sr-only" />
      {children}
    </label>
  );
}

export function ReceiptForm({
  clients,
  business,
  initialClientId,
  initialProjectId,
  existingPayment,
}: {
  clients: ReceiptFormClient[];
  business: Business;
  initialClientId?: string;
  initialProjectId?: string;
  existingPayment?: ExistingPayment;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const today = lagosToday();
  // One id per opened form: retries and double-clicks can't issue twice.
  const [requestId] = useState(() => crypto.randomUUID());

  const startClient = clients.find((c) => c.id === initialClientId) ?? null;
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length === 0 ? "new" : "existing");
  const [clientId, setClientId] = useState(startClient?.id ?? "");
  const [newClient, setNewClient] = useState({ name: "", businessName: "", email: "", phone: "" });
  const client = clients.find((c) => c.id === clientId) ?? null;

  const firstProject = client?.projects.find((p) => p.id === initialProjectId) ?? client?.projects.find((p) => p.status !== "CANCELLED");
  const [projectMode, setProjectMode] = useState<"existing" | "new">(firstProject ? "existing" : "new");
  const [projectId, setProjectId] = useState(firstProject?.id ?? "");
  const [newProject, setNewProject] = useState({ title: "", serviceType: "", description: "", price: "", additionalCharges: "", discount: "", referenceNumber: "" });
  const project = projectMode === "existing" ? (client?.projects.find((p) => p.id === projectId) ?? null) : null;

  // A receipt for a payment that's already on record (e.g. a project that's
  // been paid in full): no new amount, so nothing is counted twice.
  const [paymentMode, setPaymentMode] = useState<"recorded" | "new">(isFullyPaid(firstProject) ? "recorded" : "new");
  const [recordedId, setRecordedId] = useState(defaultRecorded(firstProject));
  const recordedList = projectMode === "existing" ? (project?.recorded ?? []) : [];
  const usingRecorded = !existingPayment && recordedList.length > 0 && paymentMode === "recorded";
  const recordedPayment = usingRecorded ? (recordedList.find((r) => r.id === recordedId) ?? null) : null;
  function syncProject(p: Project | undefined) {
    setPaymentMode(isFullyPaid(p) ? "recorded" : "new");
    setRecordedId(defaultRecorded(p));
  }

  const [payment, setPayment] = useState({ amount: "", paidOn: today, method: "bank_transfer", reference: "", description: "", notes: "", kind: "PROJECT" as "PROJECT" | "MAINTENANCE" });
  const [issueDate, setIssueDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ReceiptSnapshot | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  function pickClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    const p = c?.projects.find((x) => x.status !== "CANCELLED") ?? c?.projects[0];
    setProjectId(p?.id ?? "");
    setProjectMode(p ? "existing" : "new");
    syncProject(p);
    setConfirmDuplicate(false);
  }

  // Live figures: what the receipt will say after this payment.
  const figures = useMemo(() => {
    const amount = parseNairaToKobo(payment.amount) ?? 0;
    let total: number | null;
    let paidBefore = 0;
    let count = 0;
    if (project) {
      total = project.totalKobo;
      paidBefore = project.paidKobo;
      count = project.payments;
    } else {
      total = agreedTotalKobo(parseNairaToKobo(newProject.price), parseNairaToKobo(newProject.additionalCharges), parseNairaToKobo(newProject.discount));
    }
    const paidAfter = paidBefore + amount;
    const status = paymentStatus(total, paidAfter);
    return {
      amount,
      total,
      paidBefore,
      paidAfter,
      outstandingBefore: total === null ? null : Math.max(total - paidBefore, 0),
      outstandingAfter: total === null ? null : Math.max(total - paidAfter, 0),
      credit: total === null ? 0 : Math.max(paidAfter - total, 0),
      status,
      suggested: defaultPaymentDescription(count + 1, status, total !== null),
    };
  }, [payment.amount, project, newProject.price, newProject.additionalCharges, newProject.discount]);

  const money = (k: number | null) => (k === null ? "Not set" : formatMinor(k, business.currencySymbol));

  function body(isPreview: boolean, dup: boolean) {
    if (existingPayment || usingRecorded) return { clientRequestId: requestId, preview: isPreview, issueDate, paymentId: existingPayment?.id ?? recordedId };
    return {
      clientRequestId: requestId,
      preview: isPreview,
      confirmDuplicate: dup,
      issueDate,
      ...(clientMode === "existing" ? { clientId } : { newClient: { name: newClient.name, businessName: newClient.businessName || null, email: newClient.email || null, phone: newClient.phone || null } }),
      ...(projectMode === "existing"
        ? { projectId }
        : {
            newProject: {
              title: newProject.title,
              serviceType: newProject.serviceType || null,
              description: newProject.description || null,
              price: newProject.price || null,
              additionalCharges: newProject.additionalCharges || null,
              discount: newProject.discount || null,
              referenceNumber: newProject.referenceNumber || null,
              status: "IN_PROGRESS",
            },
          }),
      payment: {
        kind: payment.kind,
        amount: payment.amount,
        paidOn: payment.paidOn,
        method: payment.method,
        reference: payment.reference || null,
        description: payment.description || null,
        notes: payment.notes || null,
      },
    };
  }

  function localProblem(): string {
    if (existingPayment) return issueDate < existingPayment.paidOn ? "The issue date can't be before the payment date." : "";
    if (usingRecorded) {
      if (!recordedPayment) return "Choose the payment to issue the receipt for.";
      if (recordedPayment.receipt) return `That payment already has receipt ${recordedPayment.receipt.number}. Open it from the link above.`;
      return issueDate < recordedPayment.paidOn ? "The issue date can't be before the payment date." : "";
    }
    if (clientMode === "existing" && !clientId) return "Choose the client.";
    if (clientMode === "new" && !newClient.name.trim()) return "Enter the client's name.";
    if (projectMode === "existing" && !projectId) return "Choose the project.";
    if (projectMode === "new" && !newProject.title.trim()) return "Give the project a name.";
    for (const [label, v] of [["Total project cost", newProject.price], ["Additional charges", newProject.additionalCharges], ["Discount", newProject.discount]] as const) {
      if (projectMode === "new" && v.trim() && parseNairaToKobo(v) === null) return `${label}: enter an amount like 250000 or 250,000.50`;
    }
    const amount = parseNairaToKobo(payment.amount);
    if (!amount) return "Enter the amount received (more than 0).";
    if (payment.paidOn > today) return "The payment date can't be in the future.";
    if (issueDate < payment.paidOn) return "The issue date can't be before the payment date.";
    return "";
  }

  async function send(isPreview: boolean, dup = confirmDuplicate): Promise<void> {
    setBusy(true);
    setError("");
    try {
      if (isPreview) {
        const result = await adminRequest<{ preview: ReceiptSnapshot }>("/api/admin/receipts", { method: "POST", body: body(true, dup) });
        setPreview(result.preview);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const result = await adminRequest<{ id: string; number: string; alreadyIssued?: boolean }>("/api/admin/receipts", { method: "POST", body: body(false, dup) });
        toast.success(result.alreadyIssued ? `Receipt ${result.number} was already issued.` : `Receipt ${result.number} issued.`);
        router.push(`/admin/receipts/${result.id}`);
        router.refresh();
        return;
      }
    } catch (err) {
      if (err instanceof AdminRequestError && err.status === 409 && !dup && !existingPayment && !usingRecorded) {
        setBusy(false);
        const ok = await confirm({ title: "Possible duplicate", description: errorMessage(err), confirmLabel: "Yes, it's a separate payment" });
        if (ok) {
          setConfirmDuplicate(true);
          return send(isPreview, true);
        }
        toast.info("Nothing was saved.");
      } else {
        setError(errorMessage(err));
      }
    }
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = localProblem();
    if (problem) return setError(problem);
    void send(true);
  }

  if (preview) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
            Check every detail. Issuing saves the payment and the receipt together and gives it a permanent number.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => setPreview(null)} disabled={busy} className={buttonClass("secondary", "sm")}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to edit
            </button>
            <button type="button" onClick={() => void send(false)} disabled={busy} className={buttonClass("primary", "sm")}>
              <FileCheck2 className="h-4 w-4" aria-hidden /> {busy ? "Issuing…" : "Issue receipt"}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <ReceiptDocument r={preview} preview />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
      <div className="flex min-w-0 flex-col gap-6">
        {existingPayment ? (
          <Panel>
            <PanelHeader title="Payment" description="Issuing a receipt for a payment that's already recorded." />
            <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-faint">Client</dt><dd>{existingPayment.clientName}</dd></div>
              <div><dt className="text-xs text-faint">Project</dt><dd>{existingPayment.projectTitle ?? "—"}</dd></div>
              <div><dt className="text-xs text-faint">Amount</dt><dd className="font-medium text-emerald-300">{money(existingPayment.amountKobo)}</dd></div>
              <div><dt className="text-xs text-faint">Paid on · method</dt><dd>{existingPayment.paidOn} · {existingPayment.methodLabel}</dd></div>
              {existingPayment.description && <div><dt className="text-xs text-faint">Description</dt><dd>{existingPayment.description}</dd></div>}
            </dl>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">
              Something wrong? Edit the payment in <Link href="/admin/receipts/payments" className="text-accent-bright hover:underline">Payment history</Link> first.
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <PanelHeader title="1. Client" description="Pick an existing client, or add a new one." />
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Client">
                  <Choice name="client-mode" value="existing" current={clientMode} onChange={(v) => setClientMode(v as "existing")}>Existing client</Choice>
                  <Choice name="client-mode" value="new" current={clientMode} onChange={(v) => { setClientMode(v as "new"); setProjectMode("new"); }}>New client</Choice>
                </div>
                {clientMode === "existing" ? (
                  clients.length === 0 ? (
                    <p className="text-sm text-muted">No clients yet. Choose “New client”.</p>
                  ) : (
                    <Field label="Client" htmlFor="rc-client">
                      <select id="rc-client" value={clientId} onChange={(e) => pickClient(e.target.value)} className="field" required>
                        <option value="">Choose a client…</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.businessName ? ` (${c.businessName})` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Client name" htmlFor="rc-cname">
                      <input id="rc-cname" required maxLength={200} value={newClient.name} onChange={(e) => setNewClient((v) => ({ ...v, name: e.target.value }))} className="field" />
                    </Field>
                    <Field label="Business name (optional)" htmlFor="rc-cbiz">
                      <input id="rc-cbiz" maxLength={200} value={newClient.businessName} onChange={(e) => setNewClient((v) => ({ ...v, businessName: e.target.value }))} className="field" />
                    </Field>
                    <Field label="Email (optional)" htmlFor="rc-cemail">
                      <input id="rc-cemail" type="email" maxLength={200} value={newClient.email} onChange={(e) => setNewClient((v) => ({ ...v, email: e.target.value }))} className="field" />
                    </Field>
                    <Field label="Phone (optional)" htmlFor="rc-cphone">
                      <input id="rc-cphone" type="tel" inputMode="tel" maxLength={40} value={newClient.phone} onChange={(e) => setNewClient((v) => ({ ...v, phone: e.target.value }))} className="field" placeholder="0803 123 4567" />
                    </Field>
                  </div>
                )}
                {client && clientMode === "existing" && (
                  <p className="text-xs text-muted">{[client.email, client.phone].filter(Boolean).join(" · ") || "No email or phone on record."}</p>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="2. Project" description="Each deposit is recorded against a project, so balances add up." />
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Project">
                  <Choice name="project-mode" value="existing" current={projectMode} onChange={(v) => setProjectMode(v as "existing")}>Existing project</Choice>
                  <Choice name="project-mode" value="new" current={projectMode} onChange={(v) => setProjectMode(v as "new")}>New project</Choice>
                </div>
                {projectMode === "existing" ? (
                  !client || client.projects.length === 0 ? (
                    <p className="text-sm text-muted">{client ? "This client has no projects yet. Choose “New project”." : "Choose a client first."}</p>
                  ) : (
                    <Field label="Project" htmlFor="rc-project">
                      <select id="rc-project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setConfirmDuplicate(false); syncProject(client.projects.find((p) => p.id === e.target.value)); }} className="field" required>
                        {client.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} · {money(p.totalKobo)} · {PAYMENT_STATUS_LABEL[p.paymentStatus]}
                            {p.status === "CANCELLED" ? " (cancelled)" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Project name" htmlFor="rc-ptitle" hint="e.g. “Company website”">
                        <input id="rc-ptitle" required maxLength={200} value={newProject.title} onChange={(e) => setNewProject((v) => ({ ...v, title: e.target.value }))} className="field" />
                      </Field>
                      <Field label="Service category" htmlFor="rc-ptype">
                        <input id="rc-ptype" list="rc-service-types" maxLength={120} value={newProject.serviceType} onChange={(e) => setNewProject((v) => ({ ...v, serviceType: e.target.value }))} className="field" placeholder="Choose or type" />
                        <datalist id="rc-service-types">
                          {SERVICE_TYPES.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </Field>
                    </div>
                    <Field label="Project description (optional)" htmlFor="rc-pdesc">
                      <textarea id="rc-pdesc" rows={2} maxLength={5000} value={newProject.description} onChange={(e) => setNewProject((v) => ({ ...v, description: e.target.value }))} className="field" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <MoneyInput id="rc-pprice" label="Total project cost" required value={newProject.price} onChange={(price) => setNewProject((v) => ({ ...v, price }))} hint="The agreed price for the whole project." />
                      <Field label="Project reference (optional)" htmlFor="rc-pref">
                        <input id="rc-pref" maxLength={60} value={newProject.referenceNumber} onChange={(e) => setNewProject((v) => ({ ...v, referenceNumber: e.target.value }))} className="field" placeholder="e.g. PRJ-014" />
                      </Field>
                      <MoneyInput id="rc-pcharges" label="Additional charges" value={newProject.additionalCharges} onChange={(additionalCharges) => setNewProject((v) => ({ ...v, additionalCharges }))} />
                      <MoneyInput id="rc-pdiscount" label="Discount" value={newProject.discount} onChange={(discount) => setNewProject((v) => ({ ...v, discount }))} />
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="3. Payment"
                description={usingRecorded ? "Issue the receipt for a payment you've already recorded. Nothing new is added to the balance." : "This payment only. Earlier deposits are already on record and are added up automatically."}
              />
              {recordedList.length > 0 && (
                <div className="flex flex-col gap-4 border-b border-line px-5 py-4">
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment">
                    <Choice name="payment-mode" value="recorded" current={paymentMode} onChange={(v) => setPaymentMode(v as "recorded")}>Payment already recorded</Choice>
                    <Choice name="payment-mode" value="new" current={paymentMode} onChange={(v) => setPaymentMode(v as "new")}>New payment</Choice>
                  </div>
                  {usingRecorded && (
                    <>
                      {isFullyPaid(project) && (
                        <p className="text-xs text-emerald-300">
                          This project is fully paid. Choose the payment to issue a receipt for. The last payment&apos;s receipt lists every deposit and shows “Fully Paid”.
                        </p>
                      )}
                      <Field label="Recorded payment" htmlFor="rc-recorded">
                        <select id="rc-recorded" value={recordedId} onChange={(e) => setRecordedId(e.target.value)} className="field">
                          {recordedList.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.paidOn} · {money(r.amountKobo)} · {r.description ?? r.methodLabel}
                              {r.kind === "MAINTENANCE" ? " (hosting)" : ""}
                              {r.receipt ? ` · has receipt ${r.receipt.number}` : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {recordedPayment?.receipt && (
                        <p className="text-sm text-amber-200">
                          This payment already has a receipt:{" "}
                          <Link href={`/admin/receipts/${recordedPayment.receipt.id}`} className="font-mono underline">
                            {recordedPayment.receipt.number}
                          </Link>
                          . You can print or download it from there.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
              {!usingRecorded && (
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <MoneyInput id="rc-amount" label="Amount received" required value={payment.amount} onChange={(amount) => setPayment((v) => ({ ...v, amount }))} />
                <Field label="Date paid" htmlFor="rc-paidon">
                  <input id="rc-paidon" type="date" required max={today} value={payment.paidOn} onChange={(e) => setPayment((v) => ({ ...v, paidOn: e.target.value }))} className="field" />
                </Field>
                <Field label="Payment description" htmlFor="rc-pdescr" hint={`Leave empty for “${figures.suggested}”.`}>
                  <input id="rc-pdescr" list="rc-descriptions" maxLength={120} value={payment.description} onChange={(e) => setPayment((v) => ({ ...v, description: e.target.value }))} className="field" placeholder={figures.suggested} />
                  <datalist id="rc-descriptions">
                    {PAYMENT_DESCRIPTIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Payment method" htmlFor="rc-method">
                  <select id="rc-method" value={payment.method} onChange={(e) => setPayment((v) => ({ ...v, method: e.target.value }))} className="field">
                    {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Transaction reference (optional)" htmlFor="rc-ref">
                  <input id="rc-ref" maxLength={300} value={payment.reference} onChange={(e) => setPayment((v) => ({ ...v, reference: e.target.value }))} className="field" placeholder="Bank or transfer reference" />
                </Field>
                <Field label="Payment for" htmlFor="rc-kind" hint={payment.kind === "MAINTENANCE" ? "Doesn't reduce the project balance." : undefined}>
                  <select id="rc-kind" value={payment.kind} onChange={(e) => setPayment((v) => ({ ...v, kind: e.target.value as "PROJECT" | "MAINTENANCE" }))} className="field">
                    <option value="PROJECT">The project cost</option>
                    <option value="MAINTENANCE">Hosting / maintenance</option>
                  </select>
                </Field>
                <Field label="Internal notes (optional)" htmlFor="rc-notes" hint="Only you see these. Never printed." className="sm:col-span-2">
                  <textarea id="rc-notes" rows={2} maxLength={2000} value={payment.notes} onChange={(e) => setPayment((v) => ({ ...v, notes: e.target.value }))} className="field" />
                </Field>
              </div>
              )}
            </Panel>
          </>
        )}

        <Panel>
          <PanelHeader title={existingPayment ? "Receipt" : "4. Receipt"} />
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Issue date" htmlFor="rc-issue">
              <input id="rc-issue" type="date" required max={today} min={existingPayment?.paidOn ?? recordedPayment?.paidOn ?? payment.paidOn} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="field" />
            </Field>
            <div className="text-xs text-muted sm:pt-6">The receipt number (e.g. RCT-{today.slice(0, 4)}-0001) is assigned automatically when you issue it, and never reused.</div>
          </div>
        </Panel>

        {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={buttonClass("primary", "md")}>
            <Eye className="h-4 w-4" aria-hidden /> {busy ? "Checking…" : "Preview receipt"}
          </button>
          <Link href="/admin/receipts" className={buttonClass("ghost", "md")}>
            Cancel
          </Link>
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        {usingRecorded && project && (
          <Panel>
            <PanelHeader title="Project account" />
            <dl className="flex flex-col gap-2 px-5 py-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Total project cost</dt><dd className="tabular-nums">{money(project.totalKobo)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Total paid</dt><dd className="tabular-nums text-emerald-300">{money(project.paidKobo)}</dd></div>
              <div className="flex justify-between gap-3 font-medium"><dt>Outstanding</dt><dd className="tabular-nums text-amber-300">{money(project.outstandingKobo)}</dd></div>
              <div className="flex items-center justify-between gap-3 pt-1"><dt className="text-muted">Status</dt><dd><PaymentStatusPill status={project.paymentStatus} /></dd></div>
            </dl>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">The receipt shows the totals as they stood after the chosen payment.</p>
          </Panel>
        )}
        {!existingPayment && !usingRecorded && payment.kind === "PROJECT" && (
          <Panel>
            <PanelHeader title="After this payment" />
            <dl className="flex flex-col gap-2 px-5 py-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Total project cost</dt><dd className="tabular-nums">{money(figures.total)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Paid before</dt><dd className="tabular-nums">{money(figures.paidBefore)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">This payment</dt><dd className="tabular-nums text-emerald-300">{money(figures.amount)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-medium"><dt>Total paid</dt><dd className="tabular-nums">{money(figures.paidAfter)}</dd></div>
              {figures.credit > 0 ? (
                <div className="flex justify-between gap-3 font-medium"><dt>Overpaid (credit)</dt><dd className="tabular-nums text-accent-bright">{money(figures.credit)}</dd></div>
              ) : (
                <div className="flex justify-between gap-3 font-medium"><dt>Outstanding</dt><dd className="tabular-nums text-amber-300">{money(figures.outstandingAfter)}</dd></div>
              )}
              <div className="flex items-center justify-between gap-3 pt-1"><dt className="text-muted">Status</dt><dd><PaymentStatusPill status={figures.amount > 0 || figures.paidBefore > 0 ? figures.status : "UNPAID"} /></dd></div>
            </dl>
            {figures.credit > 0 && (
              <p className="border-t border-line px-5 py-3 text-xs text-amber-300">
                This is more than the {money(figures.outstandingBefore)} still owed. Check the amount; if it&apos;s right the project will show as overpaid.
              </p>
            )}
          </Panel>
        )}
        <Panel>
          <PanelHeader title="Your details on the receipt" action={<Link href="/admin/receipts/settings" className="text-xs text-muted hover:text-fg">Edit</Link>} />
          <div className="px-5 py-4 text-sm">
            <p className="font-medium">{business.businessName}</p>
            {[business.email, business.phone, business.website, business.address].filter(Boolean).map((l) => (
              <p key={l} className="break-words text-xs text-muted">{l}</p>
            ))}
          </div>
        </Panel>
      </aside>
    </form>
  );
}
