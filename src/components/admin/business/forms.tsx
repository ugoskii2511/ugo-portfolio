"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { Field } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { AdminRequestError, adminRequest, errorMessage } from "@/lib/admin-fetch";
import {
  EXPENSE_CATEGORIES,
  lagosToday,
  MAINTENANCE_INTERVALS,
  PAYMENT_METHODS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/lib/business-calc";
import { koboToInput, parseNairaToKobo } from "@/lib/money";
import { MoneyInput } from "@/components/admin/business/bits";

export type ClientOption = { id: string; name: string; projects: { id: string; title: string; status: string }[] };

export const SERVICE_TYPES = [
  "Business website",
  "E-commerce website",
  "School website",
  "Real estate website",
  "Restaurant website",
  "Portfolio website",
  "Web application",
  "Landing page",
  "Website redesign",
  "Website maintenance",
  "SEO / performance",
];

/// Shared submit plumbing: busy state, errors, toast, refresh.
function useSubmit(onDone: () => void) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(run: () => Promise<string | void>) {
    setBusy(true);
    setError("");
    try {
      const message = await run();
      if (message) toast.success(message);
      onDone();
      router.refresh();
    } catch (err) {
      if (err instanceof AdminRequestError && err.status === 409) throw err;
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, submit };
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

const datalistId = "service-types";
function ServiceTypeList() {
  return (
    <datalist id={datalistId}>
      {SERVICE_TYPES.map((s) => (
        <option key={s} value={s} />
      ))}
    </datalist>
  );
}

// ---------------------------------------------------------------- project fields

export type ProjectValues = {
  title: string;
  serviceType: string;
  description: string;
  price: string;
  status: ProjectStatus;
  startDate: string;
  expectedDeliveryDate: string;
  completedDate: string;
  maintenanceFee: string;
  maintenanceInterval: string;
  nextPaymentDate: string;
};

export const emptyProject = (): ProjectValues => ({
  title: "",
  serviceType: "",
  description: "",
  price: "",
  status: "INQUIRY",
  startDate: "",
  expectedDeliveryDate: "",
  completedDate: "",
  maintenanceFee: "",
  maintenanceInterval: "",
  nextPaymentDate: "",
});

export type ProjectInitial = {
  id: string;
  title: string;
  serviceType: string | null;
  description: string | null;
  priceKobo: number | null;
  status: ProjectStatus;
  startDate: string | null;
  expectedDeliveryDate: string | null;
  completedDate: string | null;
  maintenanceFeeKobo: number | null;
  maintenanceInterval: string | null;
  nextPaymentDate: string | null;
};

function projectValuesFrom(p: ProjectInitial): ProjectValues {
  return {
    title: p.title,
    serviceType: p.serviceType ?? "",
    description: p.description ?? "",
    price: koboToInput(p.priceKobo),
    status: p.status,
    startDate: p.startDate ?? "",
    expectedDeliveryDate: p.expectedDeliveryDate ?? "",
    completedDate: p.completedDate ?? "",
    maintenanceFee: koboToInput(p.maintenanceFeeKobo),
    maintenanceInterval: p.maintenanceInterval ?? "",
    nextPaymentDate: p.nextPaymentDate ?? "",
  };
}

function projectPayload(v: ProjectValues) {
  return {
    title: v.title,
    serviceType: v.serviceType || null,
    description: v.description || null,
    price: v.price || null,
    status: v.status,
    startDate: v.startDate || null,
    expectedDeliveryDate: v.expectedDeliveryDate || null,
    completedDate: v.completedDate || null,
    maintenanceFee: v.maintenanceFee || null,
    maintenanceInterval: v.maintenanceInterval || null,
    nextPaymentDate: v.nextPaymentDate || null,
  };
}

function moneyProblem(...values: [string, string][]) {
  for (const [label, v] of values) if (v.trim() && parseNairaToKobo(v) === null) return `${label}: enter an amount like 15000 or 15,000.50`;
  return "";
}

function ProjectFieldset({ values, set, idPrefix }: { values: ProjectValues; set: (patch: Partial<ProjectValues>) => void; idPrefix: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Field label="Project name" htmlFor={`${idPrefix}-title`} hint="e.g. “Company website” or “Online store”">
          <input id={`${idPrefix}-title`} required maxLength={200} value={values.title} onChange={(e) => set({ title: e.target.value })} className="field" />
        </Field>
        <Field label="Type of website / service" htmlFor={`${idPrefix}-type`}>
          <input id={`${idPrefix}-type`} list={datalistId} maxLength={120} value={values.serviceType} onChange={(e) => set({ serviceType: e.target.value })} className="field" placeholder="Choose or type" />
        </Field>
        <MoneyInput id={`${idPrefix}-price`} label="Agreed price" value={values.price} onChange={(price) => set({ price })} hint="Leave empty until a price is agreed." />
        <Field label="Project status" htmlFor={`${idPrefix}-status`}>
          <select id={`${idPrefix}-status`} value={values.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })} className="field">
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </Grid>
      <Field label="Description and notes" htmlFor={`${idPrefix}-desc`}>
        <textarea id={`${idPrefix}-desc`} rows={3} maxLength={5000} value={values.description} onChange={(e) => set({ description: e.target.value })} className="field" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Start date" htmlFor={`${idPrefix}-start`}>
          <input id={`${idPrefix}-start`} type="date" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} className="field" />
        </Field>
        <Field label="Expected delivery" htmlFor={`${idPrefix}-due`}>
          <input id={`${idPrefix}-due`} type="date" min={values.startDate || undefined} value={values.expectedDeliveryDate} onChange={(e) => set({ expectedDeliveryDate: e.target.value })} className="field" />
        </Field>
        <Field label="Completed on" htmlFor={`${idPrefix}-done`} hint={values.status === "COMPLETED" ? "Today if left empty." : undefined}>
          <input id={`${idPrefix}-done`} type="date" value={values.completedDate} onChange={(e) => set({ completedDate: e.target.value })} className="field" />
        </Field>
      </div>
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-xs text-muted">Hosting / maintenance (optional)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyInput id={`${idPrefix}-fee`} label="Fee" value={values.maintenanceFee} onChange={(maintenanceFee) => set({ maintenanceFee })} />
          <Field label="Billed" htmlFor={`${idPrefix}-interval`}>
            <select id={`${idPrefix}-interval`} value={values.maintenanceInterval} onChange={(e) => set({ maintenanceInterval: e.target.value })} className="field">
              <option value="">Not set</option>
              {Object.entries(MAINTENANCE_INTERVALS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Next payment due" htmlFor={`${idPrefix}-next`}>
            <input id={`${idPrefix}-next`} type="date" value={values.nextPaymentDate} onChange={(e) => set({ nextPaymentDate: e.target.value })} className="field" />
          </Field>
        </div>
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------- client dialog

export type ClientInitial = { id: string; name: string; businessName: string | null; phone: string | null; email: string | null; whatsapp: string | null; notes: string | null };

export function ClientDialog({ open, onClose, client }: { open: boolean; onClose: () => void; client?: ClientInitial }) {
  const router = useRouter();
  const formId = useId();
  const { busy, error, setError, submit } = useSubmit(onClose);
  const [values, setValues] = useState({
    name: client?.name ?? "",
    businessName: client?.businessName ?? "",
    phone: client?.phone ?? "",
    whatsapp: client?.whatsapp ?? "",
    email: client?.email ?? "",
    notes: client?.notes ?? "",
  });
  const [withProject, setWithProject] = useState(!client);
  const [project, setProject] = useState<ProjectValues>(emptyProject);
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = withProject ? moneyProblem(["Agreed price", project.price], ["Fee", project.maintenanceFee]) : "";
    if (problem) return setError(problem);
    const body = {
      name: values.name,
      businessName: values.businessName || null,
      phone: values.phone || null,
      whatsapp: values.whatsapp || null,
      email: values.email || null,
      notes: values.notes || null,
    };
    submit(async () => {
      if (client) {
        await adminRequest(`/api/admin/business/clients/${client.id}`, { method: "PATCH", body });
        return "Client updated.";
      }
      const result = await adminRequest<{ id: string }>("/api/admin/business/clients", {
        method: "POST",
        body: { ...body, project: withProject && project.title.trim() ? projectPayload(project) : null },
      });
      router.push(`/admin/business/clients/${result.id}`);
      return "Client added.";
    });
  }

  return (
    <AdminModal
      isOpen={open}
      onClose={onClose}
      title={client ? "Edit client" : "Add a client"}
      description={client ? undefined : "Only the name is required. You can add or change anything later."}
      size="lg"
      footer={<ModalFormFooter formId={formId} onCancel={onClose} submitLabel={client ? "Save changes" : "Add client"} isSubmitting={busy} error={error} />}
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
        <ServiceTypeList />
        <Grid>
          <Field label="Client name" htmlFor={`${formId}-name`} hint="A person's full name or the business name.">
            <input id={`${formId}-name`} required maxLength={200} value={values.name} onChange={set("name")} className="field" autoFocus />
          </Field>
          <Field label="Business name (optional)" htmlFor={`${formId}-biz`}>
            <input id={`${formId}-biz`} maxLength={200} value={values.businessName} onChange={set("businessName")} className="field" />
          </Field>
          <Field label="Phone (optional)" htmlFor={`${formId}-phone`}>
            <input id={`${formId}-phone`} type="tel" inputMode="tel" maxLength={40} pattern="[+0-9][0-9 ()-]{5,}" value={values.phone} onChange={set("phone")} className="field" placeholder="0803 123 4567" />
          </Field>
          <Field label="WhatsApp (optional)" htmlFor={`${formId}-wa`}>
            <input id={`${formId}-wa`} type="tel" inputMode="tel" maxLength={40} pattern="[+0-9][0-9 ()-]{5,}" value={values.whatsapp} onChange={set("whatsapp")} className="field" placeholder="Same as phone? Leave empty" />
          </Field>
          <Field label="Email (optional)" htmlFor={`${formId}-email`} className="sm:col-span-2">
            <input id={`${formId}-email`} type="email" maxLength={200} value={values.email} onChange={set("email")} className="field" />
          </Field>
        </Grid>
        <Field label="Notes (optional)" htmlFor={`${formId}-notes`}>
          <textarea id={`${formId}-notes`} rows={3} maxLength={5000} value={values.notes} onChange={set("notes")} className="field" />
        </Field>
        {!client && (
          <div className="rounded-xl border border-line p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={withProject} onChange={(e) => setWithProject(e.target.checked)} className="h-4 w-4" />
              Add their first project now
            </label>
            {withProject && (
              <div className="mt-4">
                <ProjectFieldset values={project} set={(patch) => setProject((p) => ({ ...p, ...patch }))} idPrefix={`${formId}-p`} />
              </div>
            )}
          </div>
        )}
      </form>
    </AdminModal>
  );
}

// ---------------------------------------------------------------- project dialog

export function ProjectDialog({ open, onClose, clientId, project }: { open: boolean; onClose: () => void; clientId: string; project?: ProjectInitial }) {
  const formId = useId();
  const { busy, error, setError, submit } = useSubmit(onClose);
  const [values, setValues] = useState<ProjectValues>(() => (project ? projectValuesFrom(project) : emptyProject()));
  return (
    <AdminModal
      isOpen={open}
      onClose={onClose}
      title={project ? "Edit project" : "Add a project"}
      size="lg"
      footer={<ModalFormFooter formId={formId} onCancel={onClose} submitLabel={project ? "Save changes" : "Add project"} isSubmitting={busy} error={error} />}
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const problem = moneyProblem(["Agreed price", values.price], ["Fee", values.maintenanceFee]);
          if (problem) return setError(problem);
          submit(async () => {
            if (project) {
              await adminRequest(`/api/admin/business/projects/${project.id}`, { method: "PATCH", body: projectPayload(values) });
              return "Project updated.";
            }
            await adminRequest("/api/admin/business/projects", { method: "POST", body: { clientId, ...projectPayload(values) } });
            return "Project added.";
          });
        }}
      >
        <ServiceTypeList />
        <ProjectFieldset values={values} set={(patch) => setValues((v) => ({ ...v, ...patch }))} idPrefix={formId} />
      </form>
    </AdminModal>
  );
}

// ---------------------------------------------------------------- payment dialog

export type PaymentInitial = { id: string; projectId: string | null; clientId: string; kind: "PROJECT" | "MAINTENANCE"; amountKobo: number; paidOn: string; method: string; reference: string | null };

export function PaymentDialog({
  open,
  onClose,
  options,
  defaultClientId,
  defaultProjectId,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  options: ClientOption[];
  defaultClientId?: string;
  defaultProjectId?: string;
  payment?: PaymentInitial;
}) {
  const formId = useId();
  const confirm = useConfirm();
  const toast = useToast();
  const { busy, error, setError, submit } = useSubmit(onClose);
  // One id per opened form: a double-click or retry can't record it twice.
  const [requestId] = useState(() => crypto.randomUUID());
  const [clientId, setClientId] = useState(payment?.clientId ?? defaultClientId ?? options[0]?.id ?? "");
  const projects = options.find((o) => o.id === clientId)?.projects ?? [];
  const [projectId, setProjectId] = useState(payment?.projectId ?? defaultProjectId ?? projects[0]?.id ?? "");
  const [values, setValues] = useState({
    amount: payment ? koboToInput(payment.amountKobo) : "",
    paidOn: payment?.paidOn ?? lagosToday(),
    method: payment?.method ?? "bank_transfer",
    reference: payment?.reference ?? "",
    kind: payment?.kind ?? ("PROJECT" as "PROJECT" | "MAINTENANCE"),
  });

  async function save(confirmDuplicate = false) {
    const body = { projectId, kind: values.kind, amount: values.amount, paidOn: values.paidOn, method: values.method, reference: values.reference || null };
    if (payment) {
      await adminRequest(`/api/admin/business/payments/${payment.id}`, { method: "PATCH", body });
      return "Payment updated. Balances recalculated.";
    }
    const result = await adminRequest<{ alreadyRecorded?: boolean }>("/api/admin/business/payments", {
      method: "POST",
      body: { ...body, clientRequestId: requestId, confirmDuplicate },
    });
    return result.alreadyRecorded ? "That payment was already saved." : "Payment recorded. Balance updated.";
  }

  return (
    <AdminModal
      isOpen={open}
      onClose={onClose}
      title={payment ? "Edit payment" : "Record a payment"}
      description={payment ? "The change is kept in the audit log." : undefined}
      footer={<ModalFormFooter formId={formId} onCancel={onClose} submitLabel={payment ? "Save changes" : "Record payment"} isSubmitting={busy} error={error} />}
    >
      {options.length === 0 ? (
        <p className="text-sm text-muted">Add a client with a project first. Payments are always recorded against a project.</p>
      ) : (
        <form
          id={formId}
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!projectId) return setError("Choose the project this payment is for.");
            if (parseNairaToKobo(values.amount) === null || parseNairaToKobo(values.amount) === 0) return setError("Enter the amount received.");
            try {
              await submit(() => save(false));
            } catch (err) {
              // Possible duplicate: ask before saving it again.
              const ok = await confirm({ title: "Record this payment again?", description: errorMessage(err), confirmLabel: "Yes, it's a separate payment" });
              if (ok) await submit(() => save(true));
              else toast.info("Not saved.");
            }
          }}
        >
          <Grid>
            <Field label="Client" htmlFor={`${formId}-client`}>
              <select
                id={`${formId}-client`}
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId(options.find((o) => o.id === e.target.value)?.projects[0]?.id ?? "");
                }}
                className="field"
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project" htmlFor={`${formId}-project`} error={projects.length === 0 ? "This client has no projects yet." : undefined}>
              <select id={`${formId}-project`} required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field">
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.status === "CANCELLED" ? " (cancelled)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <MoneyInput label="Amount received" required value={values.amount} onChange={(amount) => setValues((v) => ({ ...v, amount }))} />
            <Field label="Date received" htmlFor={`${formId}-date`}>
              <input id={`${formId}-date`} type="date" required max={lagosToday()} value={values.paidOn} onChange={(e) => setValues((v) => ({ ...v, paidOn: e.target.value }))} className="field" />
            </Field>
            <Field label="Payment method" htmlFor={`${formId}-method`}>
              <select id={`${formId}-method`} value={values.method} onChange={(e) => setValues((v) => ({ ...v, method: e.target.value }))} className="field">
                {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment for" htmlFor={`${formId}-kind`} hint={values.kind === "MAINTENANCE" ? "Counts as income, but doesn't reduce the project balance." : "Reduces the project's outstanding balance."}>
              <select id={`${formId}-kind`} value={values.kind} onChange={(e) => setValues((v) => ({ ...v, kind: e.target.value as "PROJECT" | "MAINTENANCE" }))} className="field">
                <option value="PROJECT">The project price</option>
                <option value="MAINTENANCE">Hosting / maintenance</option>
              </select>
            </Field>
          </Grid>
          <Field label="Reference or description (optional)" htmlFor={`${formId}-ref`}>
            <input id={`${formId}-ref`} maxLength={300} value={values.reference} onChange={(e) => setValues((v) => ({ ...v, reference: e.target.value }))} className="field" placeholder="e.g. transfer ref, “2nd instalment”" />
          </Field>
        </form>
      )}
    </AdminModal>
  );
}

// ---------------------------------------------------------------- expense dialog

export type ExpenseInitial = {
  id: string;
  name: string;
  amountKobo: number;
  category: string;
  spentOn: string;
  notes: string | null;
  method: string | null;
  client: { id: string } | null;
  project: { id: string } | null;
  hasReceipt: boolean;
};

export function ExpenseDialog({ open, onClose, options, expense, defaultProjectId }: { open: boolean; onClose: () => void; options: ClientOption[]; expense?: ExpenseInitial; defaultProjectId?: string }) {
  const formId = useId();
  const toast = useToast();
  const router = useRouter();
  const { busy, error, setError, submit } = useSubmit(onClose);
  const [requestId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState({
    name: expense?.name ?? "",
    amount: expense ? koboToInput(expense.amountKobo) : "",
    category: expense?.category ?? "hosting_domains",
    spentOn: expense?.spentOn ?? lagosToday(),
    notes: expense?.notes ?? "",
    method: expense?.method ?? "",
    link: expense?.project ? `p:${expense.project.id}` : expense?.client ? `c:${expense.client.id}` : defaultProjectId ? `p:${defaultProjectId}` : "",
  });
  const [file, setFile] = useState<File | null>(null);

  async function uploadReceipt(id: string) {
    if (!file) return;
    const data = new FormData();
    data.set("file", file);
    const res = await fetch(`/api/admin/business/expenses/${id}/receipt`, { method: "POST", body: data });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.warning(`Expense saved, but the receipt didn't upload: ${body?.error ?? "please try again"}`);
    }
  }

  return (
    <AdminModal
      isOpen={open}
      onClose={onClose}
      title={expense ? "Edit expense" : "Add an expense"}
      footer={<ModalFormFooter formId={formId} onCancel={onClose} submitLabel={expense ? "Save changes" : "Add expense"} isSubmitting={busy} error={error} />}
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const kobo = parseNairaToKobo(values.amount);
          if (!kobo) return setError("Enter the amount spent.");
          if (file && file.size > 4 * 1024 * 1024) return setError("The receipt file is over 4 MB.");
          const body = {
            name: values.name,
            amount: values.amount,
            category: values.category,
            spentOn: values.spentOn,
            notes: values.notes || null,
            method: values.method || null,
            projectId: values.link.startsWith("p:") ? values.link.slice(2) : null,
            clientId: values.link.startsWith("c:") ? values.link.slice(2) : null,
          };
          submit(async () => {
            if (expense) {
              await adminRequest(`/api/admin/business/expenses/${expense.id}`, { method: "PATCH", body });
              await uploadReceipt(expense.id);
              return "Expense updated.";
            }
            const result = await adminRequest<{ ids: string[] }>("/api/admin/business/expenses", { method: "POST", body: { ...body, clientRequestId: requestId } });
            await uploadReceipt(result.ids[0]);
            router.refresh();
            return "Expense added.";
          });
        }}
      >
        <Grid>
          <Field label="What was it for?" htmlFor={`${formId}-name`} className="sm:col-span-2">
            <input id={`${formId}-name`} required maxLength={200} value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} className="field" placeholder="e.g. Domain renewal for client site" />
          </Field>
          <MoneyInput label="Amount" required value={values.amount} onChange={(amount) => setValues((v) => ({ ...v, amount }))} />
          <Field label="Date" htmlFor={`${formId}-date`}>
            <input id={`${formId}-date`} type="date" required value={values.spentOn} onChange={(e) => setValues((v) => ({ ...v, spentOn: e.target.value }))} className="field" />
          </Field>
          <Field label="Category" htmlFor={`${formId}-cat`}>
            <select id={`${formId}-cat`} value={values.category} onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))} className="field">
              {Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Paid with (optional)" htmlFor={`${formId}-method`}>
            <select id={`${formId}-method`} value={values.method} onChange={(e) => setValues((v) => ({ ...v, method: e.target.value }))} className="field">
              <option value="">Not recorded</option>
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="For a client or project? (optional)" htmlFor={`${formId}-link`} className="sm:col-span-2" hint="Linked to a project, it's deducted from that project's profit. Otherwise it's a general business expense.">
            <select id={`${formId}-link`} value={values.link} onChange={(e) => setValues((v) => ({ ...v, link: e.target.value }))} className="field">
              <option value="">General business expense</option>
              {options.map((o) => (
                <optgroup key={o.id} label={o.name}>
                  <option value={`c:${o.id}`}>{o.name}: client (no specific project)</option>
                  {o.projects.map((p) => (
                    <option key={p.id} value={`p:${p.id}`}>
                      {o.name} → {p.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </Grid>
        <Field label="Notes (optional)" htmlFor={`${formId}-notes`}>
          <textarea id={`${formId}-notes`} rows={2} maxLength={2000} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} className="field" />
        </Field>
        <Field label={expense?.hasReceipt ? "Replace receipt (optional)" : "Receipt (optional)"} htmlFor={`${formId}-file`} hint="PDF, JPG, PNG or WebP, up to 4 MB. Stored privately.">
          <input id={`${formId}-file`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm text-muted file:mr-3 file:rounded-full file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-fg" />
        </Field>
      </form>
    </AdminModal>
  );
}
