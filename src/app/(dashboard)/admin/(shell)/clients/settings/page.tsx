import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { ProspectorSettings, type SettingsPayload } from "@/components/admin/clients/prospector-settings";
import { callProspector, prospectorConfigured } from "@/lib/prospector";

export const metadata: Metadata = { title: "Prospector settings" };

export default async function ProspectorSettingsPage() {
  let data: SettingsPayload | null = null;
  let error = "";
  if (!prospectorConfigured()) {
    error = "The prospector service isn't connected. Set PROSPECTOR_URL and PROSPECTOR_API_SECRET on this site.";
  } else {
    try {
      data = await callProspector<SettingsPayload>("/settings", { timeoutMs: 15000 });
    } catch (err) {
      error = err instanceof Error ? err.message : "Couldn't load settings.";
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clients"
        title="Prospector settings"
        description="Daily usage limits, scoring rules, follow-up timing, data retention, your outreach signature and scheduled searches."
      />
      {data ? (
        <ProspectorSettings initial={data} />
      ) : (
        <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
