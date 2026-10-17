import "server-only";
import { prisma } from "@/lib/db";
import type { Job } from "@/components/admin/clients/job-runner";

/// Server-side reads shared by the client-acquisition pages. Values the
/// Python service owns (limits) fall back to its defaults when unset.
const DEFAULT_LIMITS = { max_discovery_batch: 150, max_audit_batch: 30 };

export async function getLimits(): Promise<typeof DEFAULT_LIMITS & Record<string, number>> {
  const row = await prisma.prospectorSetting.findUnique({ where: { key: "limits" } });
  return { ...DEFAULT_LIMITS, ...((row?.value as Record<string, number> | null) ?? {}) };
}

type JobRow = Awaited<ReturnType<typeof prisma.prospectJob.findMany>>[number];

export function serializeJob(job: JobRow): Job {
  return {
    id: job.id,
    type: job.type,
    status: job.status as Job["status"],
    processed: job.processed,
    total: job.total,
    error: job.error,
    log: (job.log as Job["log"]) ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

export async function recentJobs(take = 8, where: { type?: { in: string[] } } = {}) {
  const jobs = await prisma.prospectJob.findMany({ where, orderBy: { createdAt: "desc" }, take });
  return jobs.map(serializeJob);
}

/// Request time for server components (kept out of render bodies so the
/// React purity lint stays meaningful).
export function requestTime() {
  return Date.now();
}
