import type { Metadata } from "next";
import Link from "next/link";
import { Download, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { EmptyState, PageHeader, Panel, StatusPill, formatDate } from "@/components/admin/ui";
import { buttonClass, LinkButton } from "@/components/site/button";
import { STAGES, stageLabel } from "@/lib/crm";
import { INDUSTRIES, QUALIFICATION, WEBSITE_STATUS } from "@/lib/prospect-meta";
import { requestTime } from "@/lib/crm-data";

export const metadata: Metadata = { title: "Prospects" };

const PAGE_SIZE = 50;
const SORTS = {
  score: [{ score: { sort: "desc", nulls: "last" } }, { discoveredAt: "desc" }],
  discovered: [{ discoveredAt: "desc" }],
  followup: [{ followUpAt: { sort: "asc", nulls: "last" } }],
  name: [{ businessName: "asc" }],
} satisfies Record<string, Prisma.ProspectOrderByWithRelationInput[]>;

type Search = { q?: string; stage?: string; website?: string; industry?: string; sort?: string; page?: string; archived?: string };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const stage = STAGES.includes(params.stage as (typeof STAGES)[number]) ? (params.stage as (typeof STAGES)[number]) : undefined;
  const website = params.website && params.website in WEBSITE_STATUS ? (params.website as keyof typeof WEBSITE_STATUS) : undefined;
  const industry = (INDUSTRIES as readonly string[]).includes(params.industry ?? "") ? params.industry : undefined;
  const sort = (params.sort && params.sort in SORTS ? params.sort : "score") as keyof typeof SORTS;
  const archived = params.archived === "1";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.ProspectWhereInput = {
    archivedAt: archived ? { not: null } : null,
    ...(stage ? { stage } : {}),
    ...(website ? { websiteStatus: website as Prisma.ProspectWhereInput["websiteStatus"] } : {}),
    ...(industry ? { industry } : {}),
    ...(q
      ? {
          OR: [
            { businessName: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { websiteDomain: { contains: q.toLowerCase() } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, prospects] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        businessName: true,
        industry: true,
        category: true,
        city: true,
        websiteStatus: true,
        websiteDomain: true,
        stage: true,
        score: true,
        scoreOverride: true,
        qualification: true,
        followUpAt: true,
        doNotContact: true,
        priority: true,
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = requestTime();
  const link = (overrides: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { q, stage, website, industry, sort, archived: archived ? "1" : undefined, page: String(page), ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value && !(key === "page" && value === "1")) next.set(key, value);
    return `/admin/clients/prospects${next.size ? `?${next}` : ""}`;
  };
  const exportHref = `/api/admin/crm/export?${new URLSearchParams({ ...(stage ? { stage } : {}), ...(archived ? { archived: "1" } : {}) })}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clients"
        title="Prospects"
        description="Every business in your CRM, with where it came from, its website status and score."
        actions={
          <>
            <a href={exportHref} className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <LinkButton href="/admin/clients/find" size="sm">
              Find more
            </LinkButton>
          </>
        }
      />

      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="Filter prospects">
        <input type="search" name="q" defaultValue={q} placeholder="Search name, city, domain, email" aria-label="Search" className="field lg:col-span-2" />
        <select name="stage" defaultValue={stage ?? ""} aria-label="Stage" className="field">
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {stageLabel(s)}
            </option>
          ))}
        </select>
        <select name="website" defaultValue={website ?? ""} aria-label="Website status" className="field">
          <option value="">Any website status</option>
          {Object.entries(WEBSITE_STATUS).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
        <select name="industry" defaultValue={industry ?? ""} aria-label="Industry" className="field">
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort by" className="field">
          <option value="score">Highest score</option>
          <option value="discovered">Newest</option>
          <option value="followup">Follow-up due</option>
          <option value="name">Name A–Z</option>
        </select>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-6">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="archived" value="1" defaultChecked={archived} className="h-4 w-4 accent-[var(--color-accent)]" />
            Show archived
          </label>
          <button type="submit" className={buttonClass("primary", "sm")}>
            Apply
          </button>
          <Link href="/admin/clients/prospects" className="text-sm text-muted hover:text-fg">
            Reset
          </Link>
          <p className="ml-auto text-sm text-muted" aria-live="polite">
            {total} prospect{total === 1 ? "" : "s"}
          </p>
        </div>
      </form>

      {prospects.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={total === 0 && !q && !stage && !website && !industry ? "No prospects yet" : "No prospects match"}
          description="Change the filters, or run a search to find real businesses."
          action={<LinkButton href="/admin/clients/find">Find new clients</LinkButton>}
        />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Business</th>
                  <th scope="col" className="px-3 py-3 font-medium">Website</th>
                  <th scope="col" className="px-3 py-3 font-medium">Score</th>
                  <th scope="col" className="px-3 py-3 font-medium">Stage</th>
                  <th scope="col" className="px-5 py-3 font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {prospects.map((p) => {
                  const score = p.scoreOverride ?? p.score;
                  const status = WEBSITE_STATUS[p.websiteStatus];
                  const qualification = p.qualification ? QUALIFICATION[p.qualification] : undefined;
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link href={`/admin/clients/prospects/${p.id}`} className="font-medium hover:text-accent-bright">
                          {p.priority > 0 && <span className="sr-only">High priority: </span>}
                          {p.priority > 0 && <span aria-hidden className="mr-1 text-amber-300">●</span>}
                          {p.businessName}
                        </Link>
                        <p className="text-xs text-muted">{[p.industry ?? p.category, p.city].filter(Boolean).join(" · ") || "—"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        {p.websiteDomain && <p className="mt-1 truncate font-mono text-[0.7rem] text-faint">{p.websiteDomain}</p>}
                      </td>
                      <td className="px-3 py-3">
                        {score === null ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <span className="font-mono">
                            {score}
                            {p.scoreOverride !== null && <span className="text-faint" title="Manually overridden">*</span>}
                          </span>
                        )}
                        {qualification && <p className="text-xs text-muted">{qualification.label}</p>}
                      </td>
                      <td className="px-3 py-3">
                        {p.doNotContact ? <StatusPill tone="danger">Do not contact</StatusPill> : <span className="text-sm">{stageLabel(p.stage)}</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted">
                        {p.followUpAt ? (
                          <span className={p.followUpAt.getTime() < now ? "text-red-300" : undefined}>{formatDate(p.followUpAt.toISOString())}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={link({ page: String(page - 1) })} className={buttonClass("secondary", "sm")}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={link({ page: String(page + 1) })} className={buttonClass("secondary", "sm")}>
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
