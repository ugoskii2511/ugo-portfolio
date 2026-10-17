import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProspectWorkspace, type ProspectView } from "@/components/admin/clients/prospect-workspace";
import { prospectorConfigured } from "@/lib/prospector";

export const metadata: Metadata = { title: "Prospect" };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      audits: { orderBy: { createdAt: "desc" }, take: 3 },
      notes: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, take: 100 },
      drafts: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { dueAt: "asc" } },
    },
  });
  if (!prospect) notFound();

  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  // Plain JSON for the client component.
  const view: ProspectView = {
    id: prospect.id,
    businessName: prospect.businessName,
    category: prospect.category,
    industry: prospect.industry,
    address: prospect.address,
    city: prospect.city,
    state: prospect.state,
    country: prospect.country,
    latitude: prospect.latitude,
    longitude: prospect.longitude,
    website: prospect.website,
    websiteStatus: prospect.websiteStatus,
    websiteCheckedAt: iso(prospect.websiteCheckedAt),
    websiteEvidence: prospect.websiteEvidence,
    email: prospect.email,
    phone: prospect.phone,
    source: prospect.source,
    sourceUrl: prospect.sourceUrl,
    sourceLicense: prospect.sourceLicense,
    discoveredAt: prospect.discoveredAt.toISOString(),
    stage: prospect.stage,
    priority: prospect.priority,
    score: prospect.score,
    scoreBreakdown: (prospect.scoreBreakdown as ProspectView["scoreBreakdown"]) ?? null,
    scoreOverride: prospect.scoreOverride,
    qualification: prospect.qualification,
    recommendedService: prospect.recommendedService,
    nextAction: prospect.nextAction,
    scoredAt: iso(prospect.scoredAt),
    proposalAmount: prospect.proposalAmount,
    wonAmount: prospect.wonAmount,
    outcomeReason: prospect.outcomeReason,
    doNotContact: prospect.doNotContact,
    archived: prospect.archivedAt !== null,
    audits: prospect.audits.map((a) => ({
      id: a.id,
      url: a.url,
      finalUrl: a.finalUrl,
      status: a.status,
      httpStatus: a.httpStatus,
      responseMs: a.responseMs,
      pageBytes: a.pageBytes,
      findings: a.findings as ProspectView["audits"][number]["findings"],
      pagespeed: (a.pagespeed as ProspectView["audits"][number]["pagespeed"]) ?? null,
      error: a.error,
      createdAt: a.createdAt.toISOString(),
    })),
    notes: prospect.notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString() })),
    events: prospect.events.map((e) => ({ id: e.id, type: e.type, channel: e.channel, summary: e.summary, createdAt: e.createdAt.toISOString() })),
    drafts: prospect.drafts.map((d) => ({
      id: d.id,
      template: d.template,
      channel: d.channel,
      subject: d.subject,
      body: d.body,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      sentAt: iso(d.sentAt),
    })),
    followUps: prospect.followUps.map((f) => ({ id: f.id, title: f.title, dueAt: f.dueAt.toISOString(), status: f.status })),
  };

  return <ProspectWorkspace prospect={view} configured={prospectorConfigured()} />;
}
