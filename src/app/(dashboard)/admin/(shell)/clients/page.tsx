import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, CalendarClock, CheckCircle2, FileEdit, MessageSquareReply, Radar, Send, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState, PageHeader, Panel, PanelHeader, StatusPill, formatDate, formatRelative } from "@/components/admin/ui";
import { LinkButton } from "@/components/site/button";
import { formatNaira, jobTone } from "@/lib/prospect-meta";
import { recentJobs, requestTime } from "@/lib/crm-data";
import { callProspector, prospectorConfigured } from "@/lib/prospector";
import { stageLabel } from "@/lib/crm";


export const metadata: Metadata = { title: "Client pipeline" };

type Usage = { provider: string; used: number; limit: number; alert: boolean }[];

async function usage(): Promise<{ usage: Usage } | { error: string }> {
  if (!prospectorConfigured()) return { error: "Prospector service not connected." };
  try {
    return await callProspector<{ usage: Usage }>("/settings", { timeoutMs: 8000 });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't load usage." };
  }
}

export default async function ClientsOverviewPage() {
  const weekAgo = new Date(requestTime() - 7 * 24 * 60 * 60 * 1000);
  const active = { archivedAt: null };
  const [
    total,
    newThisWeek,
    qualified,
    needsReview,
    draftsWaiting,
    approvedUnsent,
    sentCount,
    contactedProspects,
    replies,
    stageCounts,
    revenue,
    followUps,
    events,
    jobs,
    usageResult,
  ] = await Promise.all([
    prisma.prospect.count({ where: active }),
    prisma.prospect.count({ where: { ...active, discoveredAt: { gte: weekAgo } } }),
    prisma.prospect.count({ where: { ...active, stage: "QUALIFIED" } }),
    prisma.prospect.count({ where: { ...active, stage: "NEEDS_REVIEW" } }),
    prisma.outreachDraft.count({ where: { status: "draft" } }),
    prisma.outreachDraft.count({ where: { status: "approved" } }),
    prisma.prospectEvent.count({ where: { type: "outreach_sent" } }),
    prisma.prospectEvent.findMany({ where: { type: "outreach_sent" }, distinct: ["prospectId"], select: { prospectId: true } }),
    prisma.prospectEvent.count({ where: { type: "reply" } }),
    prisma.prospect.groupBy({ by: ["stage"], where: active, _count: true }),
    prisma.prospect.aggregate({ where: { stage: "WON" }, _sum: { wonAmount: true } }),
    prisma.followUpTask.findMany({
      where: { status: "open" },
      orderBy: { dueAt: "asc" },
      take: 6,
      include: { prospect: { select: { businessName: true } } },
    }),
    prisma.prospectEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { prospect: { select: { businessName: true } } },
    }),
    recentJobs(5),
    usage(),
  ]);

  const byStage = Object.fromEntries(stageCounts.map((s) => [s.stage, s._count])) as Record<string, number>;
  const won = byStage.WON ?? 0;
  const contacted = contactedProspects.length;
  const now = requestTime();

  if (total === 0 && jobs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <EmptyState
          icon={<Radar className="h-5 w-5" />}
          title="No prospects yet"
          description="Run your first search to find real businesses near you, or add someone you already know. New to this? Start with “How it works”."
          action={<LinkButton href="/admin/clients/find">Find new clients</LinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prospects"
          value={total}
          icon={<Users className="h-4 w-4" />}
          detail={`${newThisWeek} new in the last 7 days`}
          href="/admin/clients/prospects"
        />
        <StatCard
          label="Qualified · needs review"
          value={`${qualified} · ${needsReview}`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          detail="Scored by your own rules"
          href="/admin/clients/prospects?stage=QUALIFIED"
        />
        <StatCard
          label="Drafts to approve"
          value={draftsWaiting}
          icon={<FileEdit className="h-4 w-4" />}
          detail={approvedUnsent > 0 ? `${approvedUnsent} approved, not sent yet` : "Nothing approved and waiting"}
          href="/admin/clients/outreach"
          tone={draftsWaiting > 0 ? "attention" : "default"}
        />
        <StatCard
          label="Messages sent"
          value={sentCount}
          icon={<Send className="h-4 w-4" />}
          detail={`${contacted} business${contacted === 1 ? "" : "es"} contacted`}
        />
        <StatCard
          label="Replies"
          value={replies}
          icon={<MessageSquareReply className="h-4 w-4" />}
          detail={contacted > 0 ? `${Math.round(((byStage.REPLIED ?? 0) / contacted) * 100)}% of contacted are at “Replied”` : "No outreach logged yet"}
        />
        <StatCard
          label="Consultations · proposals"
          value={`${byStage.CONSULTATION_SCHEDULED ?? 0} · ${(byStage.PROPOSAL_SENT ?? 0) + (byStage.NEGOTIATION ?? 0)}`}
          icon={<CalendarClock className="h-4 w-4" />}
          detail="Currently at these stages"
          href="/admin/clients/pipeline"
        />
        <StatCard
          label="Won"
          value={won}
          icon={<CheckCircle2 className="h-4 w-4" />}
          detail={contacted > 0 ? `${((won / contacted) * 100).toFixed(1)}% of contacted businesses` : "Conversion shows once you've contacted someone"}
        />
        <StatCard
          label="Revenue won"
          value={formatNaira(revenue._sum.wonAmount ?? 0)}
          icon={<Banknote className="h-4 w-4" />}
          detail="Sum of amounts you recorded on won deals"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Follow-ups" description="Open reminders, soonest first." />
          {followUps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No follow-ups scheduled.</p>
          ) : (
            <ul className="divide-y divide-line">
              {followUps.map((task) => {
                const overdue = task.dueAt.getTime() < now;
                return (
                  <li key={task.id}>
                    <Link href={`/admin/clients/prospects/${task.prospectId}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.02]">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{task.prospect.businessName}</span>
                        <span className="block truncate text-xs text-muted">{task.title}</span>
                      </span>
                      <StatusPill tone={overdue ? "danger" : "neutral"}>{overdue ? "Overdue" : formatDate(task.dueAt.toISOString())}</StatusPill>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Usage today" description="Free-service request limits you set. Jobs pause when one is reached." />
          {"error" in usageResult ? (
            <p className="px-5 py-6 text-sm text-amber-300">{usageResult.error}</p>
          ) : (
            <ul className="flex flex-col gap-4 px-5 py-5">
              {usageResult.usage.map(({ provider, used, limit, alert }) => {
                const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                return (
                  <li key={provider}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium capitalize">{provider.replace(/_/g, " ")}</span>
                      <span className="font-mono text-muted">
                        {used} / {limit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                      <div className={alert ? "h-full bg-amber-400" : "h-full bg-accent"} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Recent activity" />
          {events.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((event) => (
                <li key={event.id}>
                  <Link href={`/admin/clients/prospects/${event.prospectId}`} className="flex items-start justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.02]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{event.prospect.businessName}</span>
                      <span className="block truncate text-xs text-muted">{event.summary}</span>
                    </span>
                    <span className="shrink-0 text-xs text-faint">{formatRelative(event.createdAt.toISOString())}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent jobs"
            action={
              <Link href="/admin/clients/find" className="text-xs text-accent-bright hover:underline">
                Run a search
              </Link>
            }
          />
          {jobs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No jobs yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {jobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium capitalize">{job.type}</span>
                    <span className="block truncate text-xs text-muted">
                      {job.processed}
                      {job.total !== null ? ` / ${job.total}` : ""} processed · {formatRelative(job.createdAt!)}
                    </span>
                  </span>
                  <StatusPill tone={jobTone(job.status)}>{job.status}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="By stage" />
        <ul className="flex flex-wrap gap-2 p-5">
          {Object.entries(byStage).map(([stage, count]) => (
            <li key={stage}>
              <Link href={`/admin/clients/prospects?stage=${stage}`} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs hover:border-line-strong">
                {stageLabel(stage)} <span className="font-mono text-accent-bright">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Header() {
  return (
    <PageHeader
      eyebrow="Clients"
      title="Client pipeline"
      description="Your prospecting at a glance. Every number here is counted from records in your database."
      actions={
        <>
          <LinkButton href="/admin/clients/guide" variant="secondary" arrow={false}>
            How it works
          </LinkButton>
          <LinkButton href="/admin/clients/find">Find new clients</LinkButton>
        </>
      }
    />
  );
}
