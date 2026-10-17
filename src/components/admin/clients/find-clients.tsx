"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Search, Upload, UserPlus } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { Field, Panel, PanelHeader, Segmented, Switch } from "@/components/admin/ui";
import { JobCard, useJobRunner, type Job } from "@/components/admin/clients/job-runner";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { INDUSTRIES, NIGERIAN_STATES } from "@/lib/prospect-meta";

type Mode = "discover" | "manual" | "csv";

export function FindClients({ maxBatch, recentJobs, configured }: { maxBatch: number; recentJobs: Job[]; configured: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("discover");
  const runner = useJobRunner(() => router.refresh());

  return (
    <div className="flex flex-col gap-6">
      {!configured && (
        <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          The prospector service isn&apos;t connected yet (PROSPECTOR_URL / PROSPECTOR_API_SECRET), so searches can&apos;t run.
        </p>
      )}
      <Segmented
        label="How to add prospects"
        value={mode}
        onChange={setMode}
        options={[
          { value: "discover", label: "Discover automatically" },
          { value: "manual", label: "Add manually" },
          { value: "csv", label: "Import CSV" },
        ]}
      />
      {mode === "discover" && <DiscoverForm maxBatch={maxBatch} runner={runner} disabled={!configured} />}
      {mode === "manual" && <ManualForm disabled={!configured} />}
      {mode === "csv" && <CsvImport disabled={!configured} />}

      {runner.error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {runner.error}
        </p>
      )}
      {runner.jobs.length > 0 && (
        <section aria-label="This search" className="flex flex-col gap-3">
          {runner.jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              running={runner.running}
              onRetry={() => runner.resume(job.id, "retry")}
              onResume={() => runner.resume(job.id)}
              onCancel={() => runner.stop(job.id)}
            />
          ))}
          {!runner.running && runner.jobs.some((j) => j.type === "discover" && j.status === "done") && (
            <Link href="/admin/clients/prospects?sort=discovered" className={buttonClass("primary", "sm", "w-fit")}>
              View new prospects →
            </Link>
          )}
        </section>
      )}

      {recentJobs.length > 0 && (
        <Panel>
          <PanelHeader title="Recent jobs" description="Discovery, checks and audits run from here or by the scheduler." />
          <ul className="divide-y divide-line">
            {recentJobs.map((job) => (
              <li key={job.id} className="px-4 py-3 sm:px-5">
                <JobCard
                  job={runner.jobs.find((j) => j.id === job.id) ?? job}
                  running={runner.running}
                  onRetry={() => runner.resume(job.id, "retry")}
                  onResume={() => runner.resume(job.id)}
                  onCancel={() => runner.stop(job.id)}
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function DiscoverForm({ maxBatch, runner, disabled }: { maxBatch: number; runner: ReturnType<typeof useJobRunner>; disabled: boolean }) {
  const ids = { state: useId(), city: useId(), batch: useId(), country: useId() };
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("Federal Capital Territory");
  const [city, setCity] = useState("Abuja");
  const [industries, setIndustries] = useState<string[]>(["Education", "Food & drink", "Hospitality"]);
  const [websiteFilter, setWebsiteFilter] = useState<"any" | "with_website" | "without_website">("any");
  const [batch, setBatch] = useState(25);
  const [verify, setVerify] = useState(true);

  function toggle(industry: string) {
    setIndustries((current) => (current.includes(industry) ? current.filter((i) => i !== industry) : [...current, industry]));
  }

  return (
    <Panel>
      <PanelHeader
        title="Find businesses"
        description="Searches OpenStreetMap's public business listings (free; © OpenStreetMap contributors). Coverage varies by area."
      />
      <form
        className="flex flex-col gap-6 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          runner.start("discover", { country, state, city, industries, websiteFilter, batch, verify });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Country" htmlFor={ids.country}>
            <input id={ids.country} value={country} onChange={(e) => setCountry(e.target.value)} className="field" required maxLength={80} />
          </Field>
          <Field label="State / region" htmlFor={ids.state} hint={country === "Nigeria" ? "Or leave the city blank to search a whole state." : undefined}>
            {country === "Nigeria" ? (
              <select id={ids.state} value={state} onChange={(e) => setState(e.target.value)} className="field">
                <option value="">Any</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input id={ids.state} value={state} onChange={(e) => setState(e.target.value)} className="field" maxLength={100} />
            )}
          </Field>
          <Field label="City / town" htmlFor={ids.city}>
            <input id={ids.city} value={city} onChange={(e) => setCity(e.target.value)} className="field" maxLength={100} placeholder="e.g. Abuja" />
          </Field>
        </div>

        <fieldset>
          <legend className="text-[0.8rem] font-medium text-fg/90">Industries</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {INDUSTRIES.map((industry) => {
              const on = industries.includes(industry);
              return (
                <button
                  key={industry}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(industry)}
                  className={clsx(
                    "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                    on ? "border-accent bg-accent-soft text-accent-bright" : "border-line text-muted hover:border-line-strong hover:text-fg"
                  )}
                >
                  {industry}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-faint">{industries.length === 0 ? "None selected: all industries are searched." : `${industries.length} selected.`}</p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[0.8rem] font-medium text-fg/90">Website status</span>
            <Segmented
              label="Website status"
              value={websiteFilter}
              onChange={setWebsiteFilter}
              options={[
                { value: "any", label: "Any" },
                { value: "without_website", label: "No website listed" },
                { value: "with_website", label: "Has a website" },
              ]}
            />
          </div>
          <Field label="How many new prospects" htmlFor={ids.batch} hint={`1–${maxBatch} per search.`}>
            <input
              id={ids.batch}
              type="number"
              min={1}
              max={maxBatch}
              value={batch}
              onChange={(e) => setBatch(Number(e.target.value))}
              className="field"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Check websites afterwards</p>
            <p className="text-xs text-muted">Verify listed sites and look for unlisted ones (a few free requests per business).</p>
          </div>
          <Switch checked={verify} onChange={setVerify} label="Check websites afterwards" />
        </div>

        <button type="submit" disabled={disabled || runner.running} className={buttonClass("primary", "md", "w-full sm:w-fit")}>
          <Search className="h-4 w-4" aria-hidden />
          {runner.running ? "Searching…" : "Find new clients"}
        </button>
      </form>
    </Panel>
  );
}

function ManualForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const id = useId();
  const [values, setValues] = useState({ businessName: "", website: "", email: "", phone: "", industry: "", city: "", state: "" });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <Panel>
      <PanelHeader title="Add a prospect" description="Someone you met or heard about. Duplicates are detected automatically." />
      <form
        className="grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            const body = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim() || null]));
            const result = await adminRequest<{ outcome: string; id: string }>("/api/admin/prospector/prospects", { method: "POST", body });
            if (result.outcome === "duplicate") toast.info("Already in your CRM, so it opened the existing prospect.");
            else toast.success(result.outcome === "suppressed" ? "Added, but it matches your do-not-contact list." : "Prospect added.");
            router.push(`/admin/clients/prospects/${result.id}`);
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Business name" htmlFor={`${id}-name`} className="sm:col-span-2">
          <input id={`${id}-name`} required maxLength={200} value={values.businessName} onChange={(e) => set("businessName", e.target.value)} className="field" />
        </Field>
        <Field label="Website" htmlFor={`${id}-web`}>
          <input id={`${id}-web`} type="url" placeholder="https://…" value={values.website} onChange={(e) => set("website", e.target.value)} className="field" />
        </Field>
        <Field label="Industry" htmlFor={`${id}-ind`}>
          <select id={`${id}-ind`} value={values.industry} onChange={(e) => set("industry", e.target.value)} className="field">
            <option value="">Not sure</option>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </Field>
        <Field label="Business email" htmlFor={`${id}-email`}>
          <input id={`${id}-email`} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} className="field" />
        </Field>
        <Field label="Business phone" htmlFor={`${id}-phone`}>
          <input id={`${id}-phone`} inputMode="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} className="field" />
        </Field>
        <Field label="City" htmlFor={`${id}-city`}>
          <input id={`${id}-city`} value={values.city} onChange={(e) => set("city", e.target.value)} className="field" />
        </Field>
        <Field label="State" htmlFor={`${id}-state`}>
          <input id={`${id}-state`} value={values.state} onChange={(e) => set("state", e.target.value)} className="field" />
        </Field>
        <button type="submit" disabled={disabled || busy} className={buttonClass("primary", "md", "w-full sm:col-span-2 sm:w-fit")}>
          <UserPlus className="h-4 w-4" aria-hidden /> {busy ? "Adding…" : "Add prospect"}
        </button>
      </form>
    </Panel>
  );
}

function CsvImport({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<{ created: number; duplicate: number; suppressed: number; invalid: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 1_000_000) {
      toast.error("That file is over 1 MB. Split it into smaller files.");
      return;
    }
    setBusy(true);
    setSummary(null);
    try {
      const csv = await file.text();
      const result = await adminRequest<typeof summary & object>("/api/admin/prospector/prospects/import", { method: "POST", body: { csv } });
      setSummary(result);
      toast.success(`Imported: ${result.created} new, ${result.duplicate} already known.`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Import a CSV" description="Columns: business name (required), website, email, phone, industry, category, address, city, state, country." />
      <div className="flex flex-col gap-4 p-5">
        <label
          className={clsx(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted transition-colors hover:text-fg",
            (disabled || busy) && "pointer-events-none opacity-60"
          )}
        >
          <Upload className="h-5 w-5" aria-hidden />
          <span className="font-medium text-fg/90">{busy ? "Importing…" : "Choose a CSV file"}</span>
          <span className="text-xs text-faint">Up to 2,000 rows / 1 MB. Only import contacts you&apos;re allowed to use.</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
        </label>
        {summary && (
          <div className="rounded-xl border border-line px-4 py-3 text-sm">
            <p>
              <span className="font-medium">{summary.created}</span> new · {summary.duplicate} already known · {summary.suppressed} on do-not-contact · {summary.invalid} skipped
            </p>
            {summary.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-amber-300">
                {summary.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
