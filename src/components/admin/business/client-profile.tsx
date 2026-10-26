"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Mail, MessageCircle, Pencil, Phone, Plus, Receipt, Wallet } from "lucide-react";
import { clsx } from "clsx";
import { buttonClass } from "@/components/site/button";
import { EmptyState, Panel, PanelHeader, StatusPill, formatDate } from "@/components/admin/ui";
import { DeleteRestore, Money, PaymentStatusPill, ProjectStatusPill } from "@/components/admin/business/bits";
import {
  ClientDialog,
  ExpenseDialog,
  PaymentDialog,
  ProjectDialog,
  type ClientInitial,
  type ClientOption,
  type ExpenseInitial,
  type PaymentInitial,
  type ProjectInitial,
} from "@/components/admin/business/forms";
import { EXPENSE_CATEGORIES, MAINTENANCE_INTERVALS, PAYMENT_METHODS } from "@/lib/business-calc";
import { formatKobo } from "@/lib/money";
import type { ClientRow, ExpenseView, PaymentView, ProjectRow } from "@/lib/business";

type Dialog =
  | { kind: "client" }
  | { kind: "project"; project?: ProjectInitial }
  | { kind: "payment"; payment?: PaymentInitial; projectId?: string }
  | { kind: "expense"; expense?: ExpenseInitial; projectId?: string }
  | null;

function waLink(number: string) {
  const digits = number.replace(/\D/g, "").replace(/^0/, "234");
  return `https://wa.me/${digits}`;
}

export function ClientProfile({
  client,
  summary,
  projects,
  deletedProjects,
  payments,
  expenses,
  options,
}: {
  client: ClientInitial & { createdAt: string; deleted: boolean };
  summary: ClientRow;
  projects: ProjectRow[];
  deletedProjects: ProjectRow[];
  payments: (PaymentView & { projectDeleted: boolean })[];
  expenses: ExpenseView[];
  options: ClientOption[];
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [n, setN] = useState(0);
  const [showDeleted, setShowDeleted] = useState(false);
  const open = (d: Dialog) => {
    setN((x) => x + 1);
    setDialog(d);
  };
  const close = () => setDialog(null);
  // The current client must be selectable even if it's the only one.
  const ownOptions = options.some((o) => o.id === client.id) ? options : [{ id: client.id, name: client.name, projects: projects.map((p) => ({ id: p.id, title: p.title, status: p.status })) }, ...options];

  const directExpenses = projects.reduce((s, p) => s + p.directExpensesKobo, 0);
  const maintenance = projects.reduce((s, p) => s + p.maintenanceKobo, 0);
  const visiblePayments = payments.filter((p) => showDeleted || (!p.deleted && !p.projectDeleted));
  const visibleExpenses = expenses.filter((e) => showDeleted || !e.deleted);
  const deletedCount = payments.filter((p) => p.deleted).length + expenses.filter((e) => e.deleted).length + deletedProjects.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/business/clients" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Clients
        </Link>
        <header className="mt-3 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="label-mono">Client since {formatDate(client.createdAt)}</p>
            <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">{client.name}</h1>
            {client.businessName && <p className="mt-1 text-muted">{client.businessName}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {client.deleted && <StatusPill tone="danger">Deleted: hidden from all totals</StatusPill>}
              <PaymentStatusPill status={summary.paymentStatus} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!client.deleted && (
              <>
                <button type="button" onClick={() => open({ kind: "client" })} className={buttonClass("secondary", "sm")}>
                  <Pencil className="h-4 w-4" aria-hidden /> Edit
                </button>
                <button type="button" disabled={projects.length === 0} onClick={() => open({ kind: "payment" })} className={buttonClass("primary", "sm")}>
                  <Wallet className="h-4 w-4" aria-hidden /> Record payment
                </button>
              </>
            )}
            <DeleteRestore
              url={`/api/admin/business/clients/${client.id}`}
              deleted={client.deleted}
              noun="client"
              detail="The client, their projects and payments will be hidden and left out of every total. Nothing is erased; you can restore them from Clients → Show deleted."
            />
          </div>
        </header>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Project value", value: summary.valueKobo, note: "Agreed prices (not cancelled)" },
          { label: "Paid", value: summary.paidKobo, note: maintenance ? `+ ${formatKobo(maintenance)} hosting/maintenance` : "Toward project prices" },
          { label: "Outstanding", value: summary.outstandingKobo, note: "Still owed", warn: summary.outstandingKobo > 0 },
          { label: "Direct expenses", value: directExpenses, note: "Linked to their projects" },
          { label: "Cash after expenses", value: summary.paidKobo + maintenance - directExpenses, note: "Received − direct expenses", signed: true },
        ].map((card) => (
          <Panel key={card.label} className="p-4">
            <p className="label-mono !text-[0.6rem]">{card.label}</p>
            <p className={clsx("mt-2 text-2xl font-semibold tabular-nums tracking-tight", card.warn && "text-amber-300", card.signed && card.value < 0 && "text-red-300")}>{formatKobo(card.value)}</p>
            <p className="mt-1 text-xs text-muted">{card.note}</p>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Panel className="self-start">
          <PanelHeader title="Contact" />
          <div className="flex flex-col gap-3 p-5 text-sm">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 hover:text-accent-bright">
                <Phone className="h-4 w-4 text-faint" aria-hidden /> {client.phone}
              </a>
            )}
            {client.whatsapp && (
              <a href={waLink(client.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-accent-bright">
                <MessageCircle className="h-4 w-4 text-faint" aria-hidden /> WhatsApp {client.whatsapp}
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-2 break-all hover:text-accent-bright">
                <Mail className="h-4 w-4 shrink-0 text-faint" aria-hidden /> {client.email}
              </a>
            )}
            {!client.phone && !client.whatsapp && !client.email && <p className="text-muted">No contact details yet.</p>}
            <div className="border-t border-line pt-3">
              <p className="text-xs font-medium text-muted">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-fg/85">{client.notes || <span className="text-faint">No notes. Use Edit to add some.</span>}</p>
            </div>
          </div>
        </Panel>

        <section aria-labelledby="projects-title" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="projects-title" className="text-sm font-semibold">
              Projects ({projects.length})
            </h2>
            {!client.deleted && (
              <button type="button" onClick={() => open({ kind: "project" })} className={buttonClass("secondary", "sm")}>
                <Plus className="h-4 w-4" aria-hidden /> Add project
              </button>
            )}
          </div>
          {projects.length === 0 ? (
            <EmptyState icon={<FileText className="h-5 w-5" />} title="No projects yet" description="Add the website or service you're building for them, with the agreed price." />
          ) : (
            projects.map((p) => <ProjectCard key={p.id} p={p} readOnly={client.deleted} onEdit={() => open({ kind: "project", project: p })} onPay={() => open({ kind: "payment", projectId: p.id })} onExpense={() => open({ kind: "expense", projectId: p.id })} />)
          )}
        </section>
      </div>

      <Panel>
        <PanelHeader
          title="Payment history"
          description="Every payment recorded. Balances are always worked out from this list."
          action={
            deletedCount > 0 ? (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="h-3.5 w-3.5" /> Show deleted ({deletedCount})
              </label>
            ) : undefined
          }
        />
        {visiblePayments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No payments recorded yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Project</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Method</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Reference</th>
                  <th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visiblePayments.map((p) => (
                  <tr key={p.id} className={clsx(p.deleted || p.projectDeleted ? "text-faint line-through decoration-faint/50" : "")}>
                    <td className="px-5 py-2.5 whitespace-nowrap">{p.paidOn}</td>
                    <td className="px-3 py-2.5">
                      {p.project?.title ?? "—"}
                      {p.kind === "MAINTENANCE" && <span className="ml-2 text-xs text-muted no-underline">hosting/maintenance</span>}
                    </td>
                    <td className={clsx("px-3 py-2.5 text-right font-medium", p.status === "CONFIRMED" ? "text-emerald-300" : "text-muted")}>
                      <span className={p.status === "CONFIRMED" ? "" : "line-through"}><Money kobo={p.amountKobo} /></span>
                      {p.status !== "CONFIRMED" && <span className="block text-xs font-normal capitalize text-red-300">{p.status.toLowerCase()}</span>}
                    </td>
                    <td className="px-3 py-2.5">{PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method}</td>
                    <td className="max-w-[14rem] truncate px-3 py-2.5 text-muted">{p.reference ?? ""}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1 no-underline">
                        {!p.deleted && !client.deleted && !p.projectDeleted && (
                          <button
                            type="button"
                            onClick={() => open({ kind: "payment", payment: { id: p.id, projectId: p.project?.id ?? null, clientId: client.id, kind: p.kind, amountKobo: p.amountKobo, paidOn: p.paidOn, method: p.method, reference: p.reference, description: p.description, notes: p.notes } })}
                            className={buttonClass("ghost", "sm", "!px-2.5")}
                          >
                            Edit
                          </button>
                        )}
                        {!p.projectDeleted && !client.deleted && (
                          <DeleteRestore url={`/api/admin/business/payments/${p.id}`} deleted={p.deleted} noun="payment" detail={`Remove this ${formatKobo(p.amountKobo)} payment? The outstanding balance goes back up. It stays in the audit log and can be restored.`} compact />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Expenses for this client"
          description="Costs linked to this client or one of their projects."
          action={
            !client.deleted ? (
              <button type="button" onClick={() => open({ kind: "expense" })} className={buttonClass("ghost", "sm", "!px-3")}>
                <Receipt className="h-4 w-4" aria-hidden /> Add expense
              </button>
            ) : undefined
          }
        />
        {visibleExpenses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No expenses linked to this client.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visibleExpenses.map((e) => (
              <li key={e.id} className={clsx("flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm", e.deleted && "text-faint line-through")}>
                <span className="min-w-0">
                  <span className="block font-medium">{e.name}</span>
                  <span className="block text-xs text-muted">
                    {e.spentOn} · {EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category}
                    {e.project ? ` · ${e.project.title}` : " · client (no project)"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Money kobo={e.amountKobo} className="font-medium text-amber-300" />
                  {e.hasReceipt && (
                    <a href={`/api/admin/business/expenses/${e.id}/receipt`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm", "!px-2.5")}>
                      Receipt
                    </a>
                  )}
                  {!e.deleted && !client.deleted && (
                    <button type="button" onClick={() => open({ kind: "expense", expense: e })} className={buttonClass("ghost", "sm", "!px-2.5")}>
                      Edit
                    </button>
                  )}
                  <DeleteRestore url={`/api/admin/business/expenses/${e.id}`} deleted={e.deleted} noun="expense" compact />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {showDeleted && deletedProjects.length > 0 && (
        <Panel>
          <PanelHeader title="Deleted projects" description="Not counted anywhere. Restore one to bring it and its payments back." />
          <ul className="divide-y divide-line">
            {deletedProjects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  {p.title} <span className="text-xs text-muted">· {formatKobo(p.priceKobo)}</span>
                </span>
                <DeleteRestore url={`/api/admin/business/projects/${p.id}`} deleted noun="project" compact />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {dialog?.kind === "client" && <ClientDialog key={n} open onClose={close} client={client} />}
      {dialog?.kind === "project" && <ProjectDialog key={n} open onClose={close} clientId={client.id} project={dialog.project} />}
      {dialog?.kind === "payment" && <PaymentDialog key={n} open onClose={close} options={ownOptions} defaultClientId={client.id} defaultProjectId={dialog.projectId} payment={dialog.payment} />}
      {dialog?.kind === "expense" && <ExpenseDialog key={n} open onClose={close} options={ownOptions} expense={dialog.expense} defaultProjectId={dialog.projectId} />}
    </div>
  );
}

function ProjectCard({ p, readOnly, onEdit, onPay, onExpense }: { p: ProjectRow; readOnly: boolean; onEdit: () => void; onPay: () => void; onExpense: () => void }) {
  const pct = p.priceKobo ? Math.min(100, Math.round((p.paidKobo / p.priceKobo) * 100)) : 0;
  return (
    <Panel as="article" className="p-5" id={`project-${p.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{p.title}</h3>
          <p className="text-xs text-muted">{[p.serviceType, p.startDate && `started ${p.startDate}`, p.expectedDeliveryDate && `due ${p.expectedDeliveryDate}`, p.completedDate && `completed ${p.completedDate}`].filter(Boolean).join(" · ") || "No details yet"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProjectStatusPill status={p.status} />
          <PaymentStatusPill status={p.paymentStatus} />
        </div>
      </div>
      {p.description && <p className="mt-3 whitespace-pre-wrap text-sm text-fg/80">{p.description}</p>}
      {p.priceKobo !== null && p.priceKobo > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted">
            <span>
              Paid {formatKobo(p.paidKobo)} of {formatKobo(p.priceKobo)}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${p.title} paid`}>
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-faint">Agreed total</dt>
          <dd>
            <Money kobo={p.priceKobo} />
            {(p.additionalChargesKobo || p.discountKobo) ? (
              <span className="block text-[0.7rem] text-faint">
                {formatKobo(p.basePriceKobo)}
                {p.additionalChargesKobo ? ` + ${formatKobo(p.additionalChargesKobo)}` : ""}
                {p.discountKobo ? ` − ${formatKobo(p.discountKobo)}` : ""}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-faint">{p.creditKobo > 0 ? "Overpaid (credit)" : "Outstanding"}</dt>
          <dd className={p.outstandingKobo > 0 ? "text-amber-300" : p.creditKobo > 0 ? "text-accent-bright" : ""}>
            <Money kobo={p.creditKobo > 0 ? p.creditKobo : p.outstandingKobo} />
            {p.status === "CANCELLED" && <span className="block text-[0.7rem] text-faint">Cancelled: not counted</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-faint">Direct expenses</dt>
          <dd><Money kobo={p.directExpensesKobo} /></dd>
        </div>
        <div>
          <dt className="text-xs text-faint">Hosting/maint. received</dt>
          <dd><Money kobo={p.maintenanceKobo} /></dd>
        </div>
        <div>
          <dt className="text-xs text-faint" title="Agreed price − direct expenses">Estimated profit</dt>
          <dd><Money kobo={p.estimatedProfitKobo} tone="auto" /></dd>
        </div>
        <div>
          <dt className="text-xs text-faint" title="All money received on this project − direct expenses">Cash after expenses</dt>
          <dd><Money kobo={p.cashAfterExpensesKobo} tone="auto" /></dd>
        </div>
        {p.maintenanceFeeKobo !== null && (
          <div>
            <dt className="text-xs text-faint">Maintenance fee</dt>
            <dd>
              <Money kobo={p.maintenanceFeeKobo} />
              {p.maintenanceInterval && <span className="text-xs text-muted"> {MAINTENANCE_INTERVALS[p.maintenanceInterval as keyof typeof MAINTENANCE_INTERVALS]?.toLowerCase()}</span>}
            </dd>
          </div>
        )}
        {p.nextPaymentDate && (
          <div>
            <dt className="text-xs text-faint">Next payment</dt>
            <dd>{p.nextPaymentDate}</dd>
          </div>
        )}
      </dl>
      {!readOnly && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <button type="button" onClick={onPay} className={buttonClass("secondary", "sm")}>
            <Wallet className="h-4 w-4" aria-hidden /> Record payment
          </button>
          <button type="button" onClick={onExpense} className={buttonClass("ghost", "sm", "!px-3")}>
            <Receipt className="h-4 w-4" aria-hidden /> Add expense
          </button>
          <button type="button" onClick={onEdit} className={buttonClass("ghost", "sm", "!px-3")}>
            <Pencil className="h-4 w-4" aria-hidden /> Edit
          </button>
          <DeleteRestore url={`/api/admin/business/projects/${p.id}`} deleted={false} noun="project" detail="The project and its payments will be left out of every total. Nothing is erased; restore it from this page with “Show deleted”." compact />
        </div>
      )}
    </Panel>
  );
}
