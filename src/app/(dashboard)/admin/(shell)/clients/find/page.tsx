import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { FindClients } from "@/components/admin/clients/find-clients";
import { getLimits, recentJobs } from "@/lib/crm-data";
import { prospectorConfigured } from "@/lib/prospector";

export const metadata: Metadata = { title: "Find clients" };

export default async function FindClientsPage() {
  const [limits, jobs] = await Promise.all([getLimits(), recentJobs(6)]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clients"
        title="Find new clients"
        description="Search public business listings by location and industry, then check each business's website. Every result is real and traceable to its source."
      />
      <FindClients maxBatch={limits.max_discovery_batch} recentJobs={jobs} configured={prospectorConfigured()} />
    </div>
  );
}
