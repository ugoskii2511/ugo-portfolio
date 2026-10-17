import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { PipelineBoard } from "@/components/admin/clients/pipeline-board";

export const metadata: Metadata = { title: "Pipeline board" };

export default async function PipelinePage() {
  const prospects = await prisma.prospect.findMany({
    where: { archivedAt: null, doNotContact: false },
    orderBy: [{ priority: "desc" }, { score: { sort: "desc", nulls: "last" } }],
    take: 600,
    select: { id: true, businessName: true, city: true, industry: true, stage: true, score: true, scoreOverride: true, priority: true, followUpAt: true, proposalAmount: true },
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clients"
        title="Pipeline board"
        description="Every active prospect by stage. Change a stage with the menu on its card."
      />
      <PipelineBoard
        prospects={prospects.map((p) => ({
          ...p,
          score: p.scoreOverride ?? p.score,
          followUpAt: p.followUpAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
