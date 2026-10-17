"use client";

import { useCallback, useRef, useState } from "react";
import { clsx } from "clsx";
import { Loader2, RotateCcw, Square } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { StatusPill } from "@/components/admin/ui";
import { jobTone } from "@/lib/prospect-meta";
import { useHasMounted } from "@/lib/use-has-mounted";
import { AdminRequestError, adminRequest, errorMessage } from "@/lib/admin-fetch";

export type Job = {
  id: string;
  type: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  processed: number;
  total: number | null;
  error: string | null;
  log: { at: string; msg: string }[] | null;
  createdAt?: string;
  children?: { id: string; type: string }[];
  _skipped?: string;
};

const JOB_LABEL: Record<string, string> = {
  discover: "Discovery",
  verify: "Website checks",
  audit: "Website audits",
  score: "Scoring",
};

/// Drives jobs from the browser: each step is a real, bounded server-side
/// run; we keep stepping while the job reports more work, then follow any
/// jobs it chained (e.g. discovery → website checks).
export function useJobRunner(onFinished?: () => void) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const cancelled = useRef(false);

  const upsertJob = (job: Job) =>
    setJobs((current) => {
      const index = current.findIndex((j) => j.id === job.id);
      if (index === -1) return [...current, job];
      const copy = [...current];
      copy[index] = job;
      return copy;
    });

  const drive = useCallback(
    async (jobId: string) => {
      let queue = [jobId];
      while (queue.length && !cancelled.current) {
        const id = queue.shift()!;
        let failures = 0;
        for (let i = 0; i < 200 && !cancelled.current; i++) {
          let job: Job;
          try {
            job = await adminRequest<Job>(`/api/admin/prospector/jobs/${id}/step`, { method: "POST" });
            failures = 0;
          } catch (err) {
            // A dropped connection or timeout mid-step: nothing was committed,
            // so wait and step again; give up after a few in a row.
            if (++failures >= 3 || (err instanceof AdminRequestError && err.status > 0 && err.status < 500)) throw err;
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
          upsertJob(job);
          if (job.children?.length) queue = [...queue, ...job.children.map((c) => c.id)];
          if (job.status === "done" || job.status === "failed" || job.status === "cancelled") break;
          if (job._skipped) {
            // Another runner (or the scheduler) holds the lease; check back shortly.
            await new Promise((r) => setTimeout(r, 4000));
          } else if (job.error) {
            // Paused (limit reached) or retrying after a provider error.
            if (/limit reached/i.test(job.error)) return;
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      }
    },
    []
  );

  const start = useCallback(
    async (type: string, params: Record<string, unknown>) => {
      setError("");
      setRunning(true);
      cancelled.current = false;
      try {
        const job = await adminRequest<Job>("/api/admin/prospector/jobs", { method: "POST", body: { type, params } });
        upsertJob(job);
        await drive(job.id);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setRunning(false);
        onFinished?.();
      }
    },
    [drive, onFinished]
  );

  const resume = useCallback(
    async (jobId: string, action?: "retry") => {
      setError("");
      setRunning(true);
      cancelled.current = false;
      try {
        if (action === "retry") await adminRequest(`/api/admin/prospector/jobs/${jobId}/retry`, { method: "POST" });
        await drive(jobId);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setRunning(false);
        onFinished?.();
      }
    },
    [drive, onFinished]
  );

  const stop = useCallback(async (jobId: string) => {
    cancelled.current = true;
    try {
      const job = await adminRequest<Job>(`/api/admin/prospector/jobs/${jobId}/cancel`, { method: "POST" });
      upsertJob(job);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  return { jobs, running, error, start, resume, stop };
}

export function JobCard({
  job,
  running,
  onRetry,
  onResume,
  onCancel,
}: {
  job: Job;
  running: boolean;
  onRetry?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}) {
  const pct = job.total ? Math.min(100, Math.round((job.processed / job.total) * 100)) : job.status === "done" ? 100 : 0;
  const active = job.status === "queued" || job.status === "running";
  // Log times are shown in the viewer’s timezone, so only after hydration.
  const mounted = useHasMounted();
  return (
    <div className="rounded-2xl border border-line bg-raised p-4 sm:p-5" data-job-id={job.id} data-job-type={job.type} data-job-status={job.status}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {active && running && <Loader2 className="h-4 w-4 animate-spin text-accent-bright" aria-hidden />}
          <p className="text-sm font-semibold">{JOB_LABEL[job.type] ?? job.type}</p>
          <StatusPill tone={jobTone(job.status)}>{job.status}</StatusPill>
        </div>
        <p className="font-mono text-xs text-muted" aria-live="polite">
          {job.processed}
          {job.total !== null ? ` / ${job.total}` : ""}
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${JOB_LABEL[job.type] ?? job.type} progress`}
      >
        <div
          className={clsx("h-full rounded-full transition-[width] duration-500", job.status === "failed" ? "bg-red-400" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {job.error && <p className="mt-3 text-sm text-amber-300">{job.error}</p>}
      {job.log && job.log.length > 0 && (
        <ol className="mt-3 max-h-40 space-y-1 overflow-y-auto font-mono text-[0.7rem] leading-relaxed text-muted">
          {job.log.slice(-8).map((entry, index) => (
            <li key={index}>
              {mounted && <span className="text-faint">{new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} </span>}
              {entry.msg}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {job.status === "failed" && onRetry && (
          <button type="button" onClick={onRetry} disabled={running} className={buttonClass("secondary", "sm")}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Retry
          </button>
        )}
        {active && !running && onResume && (
          <button type="button" onClick={onResume} className={buttonClass("secondary", "sm")}>
            Continue
          </button>
        )}
        {active && onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass("ghost", "sm", "!px-3")}>
            <Square className="h-3.5 w-3.5" aria-hidden /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
