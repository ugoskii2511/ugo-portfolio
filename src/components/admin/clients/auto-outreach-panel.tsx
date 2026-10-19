"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Play } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { Panel, PanelHeader, StatusPill } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export type OutreachStatus = {
  configured: boolean;
  settings: { email_enabled: boolean; whatsapp_drafts: boolean; window_start_hour: number; window_end_hour: number; weekdays_only: boolean };
  dailyCap: number;
  sentToday: number;
  windowOpen: boolean;
  windowNote: string;
  emailQueue: number;
  whatsappReady: number;
};

type RunResult = { emailed: unknown[]; emailFailed: { reason: string }[]; whatsappReady: unknown[]; skipped: unknown[]; notes: string[] };

/// Status of automatic outreach, with a manual "run now".
export function AutoOutreachPanel({ status, error }: { status: OutreachStatus | null; error?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(ignoreWindow: boolean) {
    setBusy(true);
    try {
      const r = await adminRequest<RunResult>("/api/admin/prospector/outreach/run", { method: "POST", body: { ignoreWindow } });
      const parts = [
        `${r.emailed.length} email${r.emailed.length === 1 ? "" : "s"} sent`,
        `${r.whatsappReady.length} WhatsApp message${r.whatsappReady.length === 1 ? "" : "s"} prepared`,
        r.emailFailed.length ? `${r.emailFailed.length} email${r.emailFailed.length === 1 ? "" : "s"} refused` : "",
      ].filter(Boolean);
      toast.success(parts.join(", ") + ".");
      for (const note of r.notes) toast.info(note);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <Panel className="p-5">
        <p className="text-sm text-amber-300">{error ?? "Automatic outreach status is unavailable."}</p>
      </Panel>
    );
  }

  const s = status.settings;
  const emailState = !status.configured ? (
    <StatusPill tone="warning">Not set up yet</StatusPill>
  ) : !s.email_enabled ? (
    <StatusPill>Switched off</StatusPill>
  ) : (
    <StatusPill tone="success">On</StatusPill>
  );

  return (
    <Panel>
      <PanelHeader
        title="Automatic outreach"
        description={`Emails go out on their own (${s.weekdays_only ? "weekdays, " : ""}${String(s.window_start_hour).padStart(2, "0")}:00–${String(s.window_end_hour).padStart(2, "0")}:00 Lagos time). WhatsApp messages are prepared for you to send.`}
        action={
          <Link href="/admin/clients/settings#autosend" className="text-xs text-accent-bright hover:underline">
            Settings
          </Link>
        }
      />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <div className="rounded-xl border border-line p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-faint" aria-hidden /> Email {emailState}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {status.sentToday}
            <span className="text-base font-normal text-muted"> / {status.dailyCap} today</span>
          </p>
          <p className="mt-1 text-xs text-muted">{status.emailQueue} qualified prospect{status.emailQueue === 1 ? "" : "s"} with an email waiting</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-faint" aria-hidden /> WhatsApp ready to send
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{status.whatsappReady}</p>
          <Link href="/admin/clients/outreach?status=approved" className="mt-1 inline-block text-xs text-accent-bright hover:underline">
            Open the list
          </Link>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-line p-4">
          <p className="text-xs text-muted">
            {status.windowOpen ? "The sending window is open now." : status.windowNote}
            {!status.configured && " Until email is set up, only WhatsApp messages are prepared."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(false)} className={buttonClass("primary", "sm")}>
              <Play className="h-4 w-4" aria-hidden /> {busy ? "Running…" : "Run now"}
            </button>
            {!status.windowOpen && status.configured && (
              <button type="button" disabled={busy} onClick={() => run(true)} className={buttonClass("ghost", "sm", "!px-3")}>
                Send emails anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
