import type { Metadata } from "next";
import Link from "next/link";
import { Gauge } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, Panel, StatusPill, formatRelative } from "@/components/admin/ui";
import { AuditBatch } from "@/components/admin/clients/audit-batch";
import { getLimits, recentJobs } from "@/lib/crm-data";
import { prospectorConfigured } from "@/lib/prospector";

export const metadata: Metadata = { title: "Website audits" };

type Finding = { status: string };
type Psi = { available?: boolean; scores?: Record<string, number> } | null;

export default async function AuditsPage() {
  const [audits, unaudited, limits, jobs] = await Promise.all([
    prisma.prospectAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { prospect: { select: { id: true, businessName: true, websiteDomain: true } } },
    }),
    prisma.prospect.count({
      where: { archivedAt: null, doNotContact: false, websiteStatus: { in: ["VERIFIED", "FOUND_UNVERIFIED"] }, audits: { none: {} } },
    }),
    getLimits(),
    recentJobs(3, { type: { in: ["audit"] } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clients"
        title="Website audits"
        description="Public, read-only checks of prospects' websites: reachability, HTTPS, mobile setup, SEO basics, contact options and broken links, plus Google PageSpeed when available. Sites that block crawlers are skipped."
      />
      <AuditBatch unaudited={unaudited} maxBatch={limits.max_audit_batch} configured={prospectorConfigured()} recent={jobs} />
      {audits.length === 0 ? (
        <EmptyState icon={<Gauge className="h-5 w-5" />} title="No audits yet" description="Audit prospects that have a website from here or from a prospect's page." />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Business</th>
                  <th scope="col" className="px-3 py-3 font-medium">Result</th>
                  <th scope="col" className="px-3 py-3 font-medium">Issues</th>
                  <th scope="col" className="px-3 py-3 font-medium">PageSpeed (mobile)</th>
                  <th scope="col" className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {audits.map((a) => {
                  const findings = (a.findings as Finding[] | null) ?? [];
                  const fails = findings.filter((f) => f.status === "fail").length;
                  const warns = findings.filter((f) => f.status === "warn").length;
                  const psi = a.pagespeed as Psi;
                  const perf = psi?.available ? psi.scores?.performance : undefined;
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link href={`/admin/clients/prospects/${a.prospect.id}`} className="font-medium hover:text-accent-bright">
                          {a.prospect.businessName}
                        </Link>
                        <p className="font-mono text-[0.7rem] text-faint">{a.prospect.websiteDomain ?? a.url}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={a.status === "completed" ? "success" : a.status === "partial" ? "warning" : "danger"}>{a.status}</StatusPill>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className="text-red-300">{fails} failed</span> · <span className="text-amber-300">{warns} warnings</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{perf !== undefined ? `Performance ${perf}` : <span className="text-faint">Not available</span>}</td>
                      <td className="px-5 py-3 text-xs text-muted">{formatRelative(a.createdAt.toISOString())}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
