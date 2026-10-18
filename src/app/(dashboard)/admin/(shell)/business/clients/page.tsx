import type { Metadata } from "next";
import Link from "next/link";
import { Download, Users } from "lucide-react";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { DeleteRestore, Money, PaymentStatusPill, ProjectStatusPill } from "@/components/admin/business/bits";
import { QuickActions } from "@/components/admin/business/quick-actions";
import { FilterField, FilterForm, hrefWith, paginate, Pagination } from "@/components/admin/business/list-controls";
import { clientProjectOptions, loadClients, type ClientRow } from "@/lib/business";
import { PAYMENT_STATUS_LABEL, PROJECT_STATUSES, PROJECT_STATUS_LABEL, type PaymentStatus, type ProjectStatus } from "@/lib/business-calc";

export const metadata: Metadata = { title: "Clients" };

type Search = { q?: string; status?: string; payment?: string; sort?: string; deleted?: string; page?: string };
const PAGE_SIZE = 25;

const SORTS: Record<string, { label: string; fn: (a: ClientRow, b: ClientRow) => number }> = {
  newest: { label: "Newest first", fn: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  oldest: { label: "Oldest first", fn: (a, b) => a.createdAt.localeCompare(b.createdAt) },
  value: { label: "Highest value", fn: (a, b) => b.valueKobo - a.valueKobo },
  owing: { label: "Most owed", fn: (a, b) => b.outstandingKobo - a.outstandingKobo },
  name: { label: "Name A–Z", fn: (a, b) => a.name.localeCompare(b.name) },
};

function matches(c: ClientRow, q: string) {
  const digits = q.replace(/\D/g, "");
  const hay = [c.name, c.businessName, c.email].filter(Boolean).join(" ").toLowerCase();
  const phones = [c.phone, c.whatsapp].filter(Boolean).join(" ").replace(/\D/g, "");
  return hay.includes(q.toLowerCase()) || (digits.length >= 3 && phones.includes(digits.replace(/^234/, "").replace(/^0/, "")));
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const status = (PROJECT_STATUSES as readonly string[]).includes(params.status ?? "") ? (params.status as ProjectStatus) : undefined;
  const payment = ["UNPAID", "PARTIAL", "PAID", "owing"].includes(params.payment ?? "") ? params.payment : undefined;
  const sort = params.sort && params.sort in SORTS ? params.sort : "newest";
  const deleted = params.deleted === "1";

  const [all, options] = await Promise.all([loadClients({ deleted }), clientProjectOptions()]);
  const rows = all
    .filter((c) => !q || matches(c, q))
    .filter((c) => !status || c.status === status)
    .filter((c) => !payment || (payment === "owing" ? c.outstandingKobo > 0 : c.paymentStatus === payment))
    .sort(SORTS[sort].fn);
  const { page, pages, slice } = paginate(rows, params.page, PAGE_SIZE);
  const current = { q: q || undefined, status, payment, sort, deleted: deleted ? "1" : undefined };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Business"
        title="Clients"
        description="Everyone you've worked with or quoted, with what they've paid and what they still owe."
        actions={
          <>
            <a href="/api/admin/business/export?type=clients" className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <QuickActions options={options} show={["client"]} />
          </>
        }
      />

      <FilterForm action="/admin/business/clients" resetHref="/admin/business/clients" count={rows.length} noun={["client", "clients"]}>
        <FilterField label="Search" grow>
          <input type="search" name="q" defaultValue={q} placeholder="Name, business, phone or email" className="field !py-2" />
        </FilterField>
        <FilterField label="Project status">
          <select name="status" defaultValue={status ?? ""} className="field !py-2">
            <option value="">Any</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Payment status">
          <select name="payment" defaultValue={payment ?? ""} className="field !py-2">
            <option value="">Any</option>
            <option value="owing">Owes money</option>
            {(["UNPAID", "PARTIAL", "PAID"] as PaymentStatus[]).map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Sort">
          <select name="sort" defaultValue={sort} className="field !py-2">
            {Object.entries(SORTS).map(([v, s]) => (
              <option key={v} value={v}>
                {s.label}
              </option>
            ))}
          </select>
        </FilterField>
        <label className="flex items-center gap-2 pb-2 text-sm text-muted">
          <input type="checkbox" name="deleted" value="1" defaultChecked={deleted} className="h-4 w-4" /> Show deleted
        </label>
      </FilterForm>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={all.length === 0 ? (deleted ? "No deleted clients" : "No clients yet") : "No clients match these filters"}
          description={all.length === 0 && !deleted ? "Add your first client with the button above. Only their name is required." : "Try a different search or reset the filters."}
        />
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {slice.map((c) => (
              <li key={c.id}>
                <Panel className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/admin/business/clients/${c.id}`} className="min-w-0">
                      <p className="truncate font-medium hover:text-accent-bright">{c.name}</p>
                      {c.businessName && <p className="truncate text-xs text-muted">{c.businessName}</p>}
                    </Link>
                    <PaymentStatusPill status={c.paymentStatus} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-faint">Value</dt>
                      <dd><Money kobo={c.valueKobo} /></dd>
                    </div>
                    <div>
                      <dt className="text-faint">Paid</dt>
                      <dd><Money kobo={c.paidKobo} /></dd>
                    </div>
                    <div>
                      <dt className="text-faint">Owes</dt>
                      <dd className={c.outstandingKobo > 0 ? "text-amber-300" : ""}><Money kobo={c.outstandingKobo} /></dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {c.status ? <ProjectStatusPill status={c.status} /> : <span className="text-xs text-faint">No projects</span>}
                    <div className="flex gap-1">
                      <Link href={`/admin/business/clients/${c.id}`} className={buttonClass("secondary", "sm")}>
                        Open
                      </Link>
                      <DeleteRestore url={`/api/admin/business/clients/${c.id}`} deleted={c.deleted} noun="client" compact />
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <Panel className="hidden overflow-hidden md:block">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <caption className="sr-only">Clients</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    {["Client", "Contact", "Website type", "Project value", "Paid", "Outstanding", "Project status", "Payment", "Added", ""].map((h, i) => (
                      <th key={i} scope="col" className={`px-4 py-3 font-medium ${i >= 3 && i <= 5 ? "text-right" : ""}`}>
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slice.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link href={`/admin/business/clients/${c.id}`} className="font-medium hover:text-accent-bright">
                          {c.name}
                        </Link>
                        {c.businessName && <p className="text-xs text-muted">{c.businessName}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {c.phone && <p>{c.phone}</p>}
                        {c.whatsapp && c.whatsapp !== c.phone && <p>WA {c.whatsapp}</p>}
                        {c.email && <p className="max-w-[12rem] truncate">{c.email}</p>}
                        {!c.phone && !c.email && !c.whatsapp && "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">{c.serviceTypes.join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-right"><Money kobo={c.valueKobo} /></td>
                      <td className="px-4 py-3 text-right"><Money kobo={c.paidKobo} /></td>
                      <td className={`px-4 py-3 text-right ${c.outstandingKobo > 0 ? "text-amber-300" : ""}`}><Money kobo={c.outstandingKobo} /></td>
                      <td className="px-4 py-3">{c.status ? <ProjectStatusPill status={c.status} /> : <span className="text-xs text-faint">No projects</span>}</td>
                      <td className="px-4 py-3"><PaymentStatusPill status={c.paymentStatus} /></td>
                      <td className="px-4 py-3 text-xs text-muted">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/business/clients/${c.id}`} className={buttonClass("secondary", "sm")}>
                            Open
                          </Link>
                          <DeleteRestore url={`/api/admin/business/clients/${c.id}`} deleted={c.deleted} noun="client" compact />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Pagination page={page} pages={pages} href={(p) => hrefWith("/admin/business/clients", current, { page: String(p) })} />
        </>
      )}
    </div>
  );
}
