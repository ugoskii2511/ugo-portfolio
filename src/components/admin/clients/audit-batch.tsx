"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { Panel, Switch } from "@/components/admin/ui";
import { JobCard, useJobRunner, type Job } from "@/components/admin/clients/job-runner";

export function AuditBatch({ unaudited, maxBatch, configured, recent }: { unaudited: number; maxBatch: number; configured: boolean; recent: Job[] }) {
  const router = useRouter();
  const runner = useJobRunner(() => router.refresh());
  const [pagespeed, setPagespeed] = useState(true);
  const limit = Math.min(unaudited, maxBatch);
  const visible = runner.jobs.length ? runner.jobs : recent.filter((j) => j.status === "queued" || j.status === "running" || j.status === "failed");

  return (
    <div className="flex flex-col gap-3">
      <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {unaudited} prospect{unaudited === 1 ? "" : "s"} with a website and no audit yet
          </p>
          <p className="text-xs text-muted">Audits up to {maxBatch} per run (change in Prospector settings).</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={pagespeed} onChange={setPagespeed} label="Include Google PageSpeed" />
            Include PageSpeed
          </label>
          <button
            type="button"
            disabled={!configured || runner.running || limit === 0}
            onClick={() => runner.start("audit", { scope: "unchecked", limit, pagespeed })}
            className={buttonClass("primary", "sm")}
          >
            <Gauge className="h-4 w-4" aria-hidden /> Audit {limit || ""} now
          </button>
        </div>
      </Panel>
      {runner.error && <p className="text-sm text-red-300">{runner.error}</p>}
      {visible.map((job) => (
        <JobCard key={job.id} job={runner.jobs.find((j) => j.id === job.id) ?? job} running={runner.running} onRetry={() => runner.resume(job.id, "retry")} onResume={() => runner.resume(job.id)} onCancel={() => runner.stop(job.id)} />
      ))}
    </div>
  );
}
