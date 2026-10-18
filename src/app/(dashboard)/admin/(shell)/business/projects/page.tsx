import type { Metadata } from "next";
import Link from "next/link";
import { Download, FolderKanban } from "lucide-react";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { Money, PaymentStatusPill, ProjectStatusPill } from "@/components/admin/business/bits";
import { QuickActions } from "@/components/admin/business/quick-actions";
import { FilterField, FilterForm, hrefWith, paginate, Pagination } from "@/components/admin/business/list-controls";
import { clientProjectOptions, loadProjects, type ProjectRow } from "@/lib/business";
import { countsTowardTotals, PAYMENT_STATUS_LABEL, PROJECT_STATUSES, PROJECT_STATUS_LABEL, type PaymentStatus, type ProjectStatus } from "@/lib/business-calc";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Projects" };

type Search = { q?: string; status?: string; payment?: string; sort?: string; page?: string };
const PAGE_SIZE = 25;

const SORTS: Record<string, { label: string; fn: (a: ProjectRow, b: ProjectRow) => number }> = {
  newest: { label: "Newest first", fn: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  oldest: { label: "Oldest first", fn: (a, b) => a.createdAt.localeCompare(b.createdAt) },
  value: { label: "Highest value", fn: (a, b) => (b.priceKobo ?? 0) - (a.priceKobo ?? 0) },
  value_asc: { label: "Lowest value", fn: (a, b) => (a.priceKobo ?? 0) - (b.priceKobo ?? 0) },
  owing: { label: "Most owed", fn: (a, b) => b.outstandingKobo - a.outstandingKobo },
  profit: { label: "Highest est. profit", fn: (a, b) => (b.estimatedProfitKobo ?? -Infinity) - (a.estimatedProfitKobo ?? -Infinity) },
};

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase().slice(0, 100) ?? "";
  const status = (PROJECT_STATUSES as readonly string[]).includes(params.status ?? "") ? (params.status as ProjectStatus) : undefined;
  const payment = ["UNPAID", "PARTIAL", "PAID"].includes(params.payment ?? "") ? (params.payment as PaymentStatus) : undefined;
  const sort = params.sort && params.sort in SORTS ? params.sort : "newest";

  const [all, options] = await Promise.all([loadProjects(), clientProjectOptions()]);
  const digits = q.replace(/\D/g, "").replace(/^234/, "").replace(/^0/, "");
  const rows = all
    .filter((p) => {
      if (!q) return true;
      const text = [p.title, p.serviceType, p.client.name, p.client.businessName, p.client.email].filter(Boolean).join(" ").toLowerCase();
      const phones = [p.client.phone, p.client.whatsapp].filter(Boolean).join(" ").replace(/\D/g, "");
      return text.includes(q) || (digits.length >= 3 && phones.includes(digits));
    })
    .filter((p) => !status || p.status === status)
    .filter((p) => !payment || p.paymentStatus === payment)
    .sort(SORTS[sort].fn);
  const { page, pages, slice } = paginate(rows, params.page, PAGE_SIZE);
  const counted = rows.filter((p) => countsTowardTotals(p.status));
  const totals = {
    price: counted.reduce((s, p) => s + (p.priceKobo ?? 0), 0),
    paid: rows.reduce((s, p) => s + p.paidKobo, 0),
    outstanding: counted.reduce((s, p) => s + p.outstandingKobo, 0),
    expenses: rows.reduce((s, p) => s + p.directExpensesKobo, 0),
    profit: counted.reduce((s, p) => s + (p.estimatedProfitKobo ?? 0), 0),
    cash: rows.reduce((s, p) => s + p.cashAfterExpensesKobo, 0),
  };
  const current = { q: params.q?.trim() || undefined, status, payment, sort };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Business"
        title="Projects"
        description="Every website project with its price, payments, balance and profitability."
        actions={
          <>
            <a href="/api/admin/business/export?type=projects" className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <QuickActions options={options} show={["payment", "client"]} />
          </>
        }
      />

      <Panel className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <p>
          <strong>Estimated profit</strong> = agreed price − expenses linked to that project. It&apos;s what the project should earn once
          fully paid.
        </p>
        <p>
          <strong>Cash after expenses</strong> = money actually received on the project (including hosting/maintenance) − its
          expenses. Unpaid balances are never counted as cash.
        </p>
        <p className="text-muted">
          General business expenses that aren&apos;t linked to a project are not deducted here; they appear in Expenses and Reports.
        </p>
      </Panel>

      <FilterForm action="/admin/business/projects" resetHref="/admin/business/projects" count={rows.length} noun={["project", "projects"]}>
        <FilterField label="Search" grow>
          <input type="search" name="q" defaultValue={params.q ?? ""} placeholder="Client, project, phone or email" className="field !py-2" />
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
      </FilterForm>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title={all.length === 0 ? "No projects yet" : "No projects match these filters"}
          description={all.length === 0 ? "Projects are added from a client's page, or along with a new client." : "Try a different search or reset the filters."}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {slice.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/business/clients/${p.client.id}#project-${p.id}`}>
                  <Panel className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.client.name}</p>
                        <p className="truncate text-xs text-muted">{p.title}</p>
                      </div>
                      <ProjectStatusPill status={p.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-faint">Price</dt>
                        <dd><Money kobo={p.priceKobo} /></dd>
                      </div>
                      <div>
                        <dt className="text-faint">Paid</dt>
                        <dd><Money kobo={p.paidKobo} /></dd>
                      </div>
                      <div>
                        <dt className="text-faint">Owes</dt>
                        <dd className={p.outstandingKobo ? "text-amber-300" : ""}><Money kobo={p.outstandingKobo} /></dd>
                      </div>
                      <div>
                        <dt className="text-faint">Expenses</dt>
                        <dd><Money kobo={p.directExpensesKobo} /></dd>
                      </div>
                      <div>
                        <dt className="text-faint">Est. profit</dt>
                        <dd><Money kobo={p.estimatedProfitKobo} tone="auto" /></dd>
                      </div>
                      <div>
                        <dt className="text-faint">Cash after exp.</dt>
                        <dd><Money kobo={p.cashAfterExpensesKobo} tone="auto" /></dd>
                      </div>
                    </dl>
                    <div className="mt-3"><PaymentStatusPill status={p.paymentStatus} /></div>
                  </Panel>
                </Link>
              </li>
            ))}
          </ul>

          <Panel className="hidden overflow-hidden md:block">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <caption className="sr-only">Projects with payments and profitability</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Client</th>
                    <th scope="col" className="px-3 py-3 font-medium">Contact</th>
                    <th scope="col" className="px-3 py-3 font-medium">Project / type</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Price</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Paid</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Outstanding</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Expenses</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Est. profit</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Cash after exp.</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-3 py-3 font-medium">Payment</th>
                    <th scope="col" className="px-3 py-3 font-medium">Added</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slice.map((p) => (
                    <tr key={p.id} className={p.status === "CANCELLED" ? "text-muted" : "hover:bg-white/[0.02]"}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/business/clients/${p.client.id}`} className="font-medium hover:text-accent-bright">
                          {p.client.name}
                        </Link>
                        {p.client.businessName && <p className="text-xs text-muted">{p.client.businessName}</p>}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {p.client.phone && <p>{p.client.phone}</p>}
                        {p.client.email && <p className="max-w-[11rem] truncate">{p.client.email}</p>}
                        {!p.client.phone && !p.client.email && "—"}
                      </td>
                      <td className="px-3 py-3">
                        <p>{p.title}</p>
                        <p className="text-xs text-muted">{p.serviceType ?? ""}</p>
                      </td>
                      <td className="px-3 py-3 text-right"><Money kobo={p.priceKobo} /></td>
                      <td className="px-3 py-3 text-right"><Money kobo={p.paidKobo} /></td>
                      <td className={`px-3 py-3 text-right ${p.outstandingKobo ? "text-amber-300" : ""}`}><Money kobo={p.outstandingKobo} /></td>
                      <td className="px-3 py-3 text-right"><Money kobo={p.directExpensesKobo} /></td>
                      <td className="px-3 py-3 text-right"><Money kobo={p.estimatedProfitKobo} tone="auto" /></td>
                      <td className="px-3 py-3 text-right"><Money kobo={p.cashAfterExpensesKobo} tone="auto" /></td>
                      <td className="px-3 py-3"><ProjectStatusPill status={p.status} /></td>
                      <td className="px-3 py-3"><PaymentStatusPill status={p.paymentStatus} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/business/clients/${p.client.id}#project-${p.id}`} className={buttonClass("secondary", "sm")}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line-strong text-sm font-medium">
                  <tr>
                    <th scope="row" colSpan={3} className="px-4 py-3 text-left">
                      Totals ({rows.length} project{rows.length === 1 ? "" : "s"}, cancelled excluded from value)
                    </th>
                    <td className="px-3 py-3 text-right">{formatKobo(totals.price)}</td>
                    <td className="px-3 py-3 text-right">{formatKobo(totals.paid)}</td>
                    <td className="px-3 py-3 text-right text-amber-300">{formatKobo(totals.outstanding)}</td>
                    <td className="px-3 py-3 text-right">{formatKobo(totals.expenses)}</td>
                    <td className="px-3 py-3 text-right"><Money kobo={totals.profit} tone="auto" /></td>
                    <td className="px-3 py-3 text-right"><Money kobo={totals.cash} tone="auto" /></td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
          <Pagination page={page} pages={pages} href={(p) => hrefWith("/admin/business/projects", current, { page: String(p) })} />
        </>
      )}
    </div>
  );
}
