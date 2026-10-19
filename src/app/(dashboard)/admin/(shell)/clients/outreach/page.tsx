import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Send } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { DraftCard } from "@/components/admin/clients/prospect-workspace";
import { callProspector, prospectorConfigured } from "@/lib/prospector";
import { AutoOutreachPanel, type OutreachStatus } from "@/components/admin/clients/auto-outreach-panel";

export const metadata: Metadata = { title: "Outreach" };

const TABS = [
  { value: "draft", label: "To approve" },
  { value: "approved", label: "Ready to send" },
  { value: "sent", label: "Sent" },
  { value: "rejected", label: "Rejected" },
] as const;

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.value === raw) ? raw! : "draft";
  const [counts, drafts] = await Promise.all([
    prisma.outreachDraft.groupBy({ by: ["status"], _count: true }),
    prisma.outreachDraft.findMany({
      where: { status },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { prospect: { select: { id: true, businessName: true, email: true, phone: true, doNotContact: true } } },
    }),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c._count])) as Record<string, number>;
  const configured = prospectorConfigured();
  let outreach: OutreachStatus | null = null;
  let outreachError = configured ? undefined : "The prospector service isn't connected.";
  if (configured) {
    try {
      outreach = await callProspector<OutreachStatus>("/outreach/status", { timeoutMs: 15000 });
    } catch (err) {
      outreachError = err instanceof Error ? err.message : "Couldn't load the outreach status.";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clients"
        title="Outreach"
        description="Qualified prospects with an email are emailed automatically (within your daily limit). WhatsApp messages are prepared under “Ready to send”: open each one in WhatsApp, send it, then click “I sent it”."
      />
      <AutoOutreachPanel status={outreach} error={outreachError} />
      <nav aria-label="Draft status" className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-full border border-line bg-white/[0.02] p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/clients/outreach?status=${tab.value}`}
            aria-current={tab.value === status ? "page" : undefined}
            className={clsx(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
              tab.value === status ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"
            )}
          >
            {tab.label}
            <span className="font-mono text-[0.65rem] text-faint">{count[tab.value] ?? 0}</span>
          </Link>
        ))}
      </nav>
      {drafts.length === 0 ? (
        <EmptyState
          icon={<Send className="h-5 w-5" />}
          title="Nothing here"
          description="Open a prospect and generate a draft. It's written only from facts recorded for that business."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {drafts.map((d) => (
            <DraftCard
              key={`${d.id}-${d.updatedAt.toISOString()}`}
              showProspect
              configured={configured}
              prospect={d.prospect}
              draft={{
                id: d.id,
                template: d.template,
                channel: d.channel,
                subject: d.subject,
                body: d.body,
                status: d.status,
                createdAt: d.createdAt.toISOString(),
                sentAt: d.sentAt?.toISOString() ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
