"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { Field, Panel, PanelHeader, StatusPill, Switch } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { INDUSTRIES, NIGERIAN_STATES } from "@/lib/prospect-meta";

type Settings = {
  limits: Record<string, number>;
  scoring: {
    weights: Record<string, number>;
    target_industries: string[];
    target_locations: string[];
    qualified_threshold: number;
    review_threshold: number;
    recent_contact_days: number;
  };
  followups: { schedule_days: number[] };
  retention: { archive_uncontacted_after_days: number; delete_archived_after_days: number };
  outreach: { sender_name: string; sender_title: string; contact_line: string };
  audit: { use_pagespeed: boolean; max_links_checked: number };
  autosend: {
    email_enabled: boolean;
    whatsapp_drafts: boolean;
    whatsapp_include_review: boolean;
    window_start_hour: number;
    window_end_hour: number;
    weekdays_only: boolean;
  };
  schedules: Schedule[];
};

type Schedule = {
  id: string;
  name: string;
  enabled: boolean;
  frequency: "daily" | "weekly";
  weekday: number;
  slots: string[];
  params: { country: string; state: string; city: string; industries: string[]; websiteFilter: string; batch: number; verify: boolean };
};

export type SettingsPayload = {
  settings: Settings;
  usage: { provider: string; used: number; limit: number; alert: boolean }[];
  integrations: { database: boolean; openstreetmap: boolean; pagespeedKey: boolean; cron: boolean; ai: string; email: string };
};

const LIMIT_LABELS: Record<string, string> = {
  overpass_per_day: "OpenStreetMap searches / day",
  nominatim_per_day: "Location lookups / day",
  site_fetch_per_day: "Website requests / day",
  pagespeed_per_day: "PageSpeed tests / day",
  email_send_per_day: "Automatic emails / day",
  max_discovery_batch: "Max prospects per search",
  max_audit_batch: "Max sites per audit run",
};

const WEIGHT_LABELS: Record<string, string> = {
  no_website: "No website",
  website_unreachable: "Website not loading",
  no_https: "No HTTPS",
  not_mobile_friendly: "Not mobile-friendly",
  slow_performance: "Slow (PageSpeed)",
  missing_title_or_description: "Missing title / description",
  high_priority_finding: "Each high-priority issue",
  medium_priority_finding: "Each medium-priority issue",
  contact_channel: "Has a public email or phone",
  target_location: "In a target location",
  target_industry: "In a target industry",
  recently_contacted: "Contacted recently",
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = [
  { value: "morning", label: "Morning (~08:00)" },
  { value: "midday", label: "Midday (~13:00)" },
  { value: "evening", label: "Evening (~17:00)" },
];

function useSave() {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  async function save(key: string, value: unknown) {
    setSaving(key);
    try {
      await adminRequest(`/api/admin/prospector/settings/${key}`, { method: "PUT", body: { value } });
      toast.success("Saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }
  return { saving, save };
}

function Section({ title, description, children, onSave, saving }: { title: string; description?: string; children: ReactNode; onSave?: () => void; saving?: boolean }) {
  return (
    <Panel>
      <PanelHeader title={title} description={description} />
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave?.();
        }}
      >
        {children}
        {onSave && (
          <button type="submit" disabled={saving} className={buttonClass("primary", "sm", "w-fit")}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </form>
    </Panel>
  );
}

const splitList = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function ProspectorSettings({ initial }: { initial: SettingsPayload }) {
  const { saving, save } = useSave();
  const [limits, setLimits] = useState(initial.settings.limits);
  const [scoring, setScoring] = useState(initial.settings.scoring);
  const [locations, setLocations] = useState(initial.settings.scoring.target_locations.join(", "));
  const [followDays, setFollowDays] = useState(initial.settings.followups.schedule_days.join(", "));
  const [retention, setRetention] = useState(initial.settings.retention);
  const [outreach, setOutreach] = useState(initial.settings.outreach);
  const [audit, setAudit] = useState(initial.settings.audit);
  const [autosend, setAutosend] = useState(
    initial.settings.autosend ?? { email_enabled: true, whatsapp_drafts: true, whatsapp_include_review: false, window_start_hour: 8, window_end_hour: 19, weekdays_only: true }
  );
  const [schedules, setSchedules] = useState<Schedule[]>(initial.settings.schedules ?? []);
  const i = initial.integrations;

  const integrations: { label: string; ok: boolean; detail: string }[] = [
    { label: "Database", ok: i.database, detail: "Supabase Postgres (shared with the site)" },
    { label: "Business discovery", ok: i.openstreetmap, detail: "OpenStreetMap: free, no key needed" },
    { label: "Google PageSpeed", ok: i.pagespeedKey, detail: i.pagespeedKey ? "API key set" : "No API key. Tests are often rate-limited; add PAGESPEED_API_KEY on the prospector project" },
    { label: "Scheduler", ok: i.cron, detail: i.cron ? "Vercel Cron is authorised" : "CRON_SECRET not set, so scheduled searches won't run" },
    { label: "AI writing", ok: false, detail: "Not configured: drafts use your fact-based templates" },
    {
      label: "Automatic email (Resend)",
      ok: i.email === "resend",
      detail:
        i.email === "resend"
          ? "Connected: qualified prospects with an email are contacted automatically within your daily limit"
          : "Not set up: add RESEND_API_KEY, OUTREACH_FROM and OUTREACH_SECRET to the prospector project. Until then, nothing is emailed",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader title="Integrations" />
        <ul className="divide-y divide-line">
          {integrations.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                <span className="block text-xs text-muted">{item.detail}</span>
              </span>
              <StatusPill tone={item.ok ? "success" : "neutral"}>{item.ok ? "Connected" : "Off"}</StatusPill>
            </li>
          ))}
        </ul>
      </Panel>

      <Section title="Daily limits" description="Jobs pause when a limit is reached and resume the next day. Today's usage is shown under each." onSave={() => save("limits", limits)} saving={saving === "limits"}>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(LIMIT_LABELS).map(([key, label]) => {
            const usage = initial.usage.find((u) => `${u.provider}_per_day` === key);
            return (
              <Field key={key} label={label} htmlFor={`limit-${key}`} hint={usage ? `${usage.used} used today` : undefined}>
                <input id={`limit-${key}`} type="number" min={0} value={limits[key] ?? 0} onChange={(e) => setLimits({ ...limits, [key]: Number(e.target.value) })} className="field" />
              </Field>
            );
          })}
        </div>
      </Section>

      <Section
        title="Scoring rules"
        description="Points added (or removed) for each fact recorded about a business. Scores are 0–100."
        onSave={() => save("scoring", { ...scoring, target_locations: splitList(locations) })}
        saving={saving === "scoring"}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(WEIGHT_LABELS).map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`w-${key}`}>
              <input
                id={`w-${key}`}
                type="number"
                min={-100}
                max={100}
                value={scoring.weights[key] ?? 0}
                onChange={(e) => setScoring({ ...scoring, weights: { ...scoring.weights, [key]: Number(e.target.value) } })}
                className="field"
              />
            </Field>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Qualified at score" htmlFor="s-q">
            <input id="s-q" type="number" min={0} max={100} value={scoring.qualified_threshold} onChange={(e) => setScoring({ ...scoring, qualified_threshold: Number(e.target.value) })} className="field" />
          </Field>
          <Field label="Needs review at score" htmlFor="s-r">
            <input id="s-r" type="number" min={0} max={100} value={scoring.review_threshold} onChange={(e) => setScoring({ ...scoring, review_threshold: Number(e.target.value) })} className="field" />
          </Field>
          <Field label="“Recently contacted” means within (days)" htmlFor="s-d">
            <input id="s-d" type="number" min={0} max={365} value={scoring.recent_contact_days} onChange={(e) => setScoring({ ...scoring, recent_contact_days: Number(e.target.value) })} className="field" />
          </Field>
        </div>
        <fieldset>
          <legend className="text-[0.8rem] font-medium text-fg/90">Target industries</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {INDUSTRIES.map((industry) => {
              const on = scoring.target_industries.includes(industry);
              return (
                <label key={industry} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setScoring({
                        ...scoring,
                        target_industries: on ? scoring.target_industries.filter((x) => x !== industry) : [...scoring.target_industries, industry],
                      })
                    }
                  />
                  {industry}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label="Target locations" htmlFor="s-loc" hint="Comma-separated city or state names.">
          <input id="s-loc" value={locations} onChange={(e) => setLocations(e.target.value)} className="field" />
        </Field>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Follow-ups"
          description="Reminders created after you log a first message, in days. They stop when the business replies."
          onSave={() => save("followups", { schedule_days: splitList(followDays).map((d) => Number.parseInt(d, 10)).filter((d) => !Number.isNaN(d)) })}
          saving={saving === "followups"}
        >
          <Field label="Days after first contact" htmlFor="fu-days" hint="e.g. 4, 10">
            <input id="fu-days" value={followDays} onChange={(e) => setFollowDays(e.target.value)} className="field" />
          </Field>
        </Section>

        <Section title="Data retention" description="Applied daily. 0 turns a rule off." onSave={() => save("retention", retention)} saving={saving === "retention"}>
          <Field label="Archive never-contacted prospects after (days)" htmlFor="r-a">
            <input id="r-a" type="number" min={0} value={retention.archive_uncontacted_after_days} onChange={(e) => setRetention({ ...retention, archive_uncontacted_after_days: Number(e.target.value) })} className="field" />
          </Field>
          <Field label="Delete archived prospects after (days)" htmlFor="r-d" hint="Do-not-contact entries are always kept.">
            <input id="r-d" type="number" min={0} value={retention.delete_archived_after_days} onChange={(e) => setRetention({ ...retention, delete_archived_after_days: Number(e.target.value) })} className="field" />
          </Field>
        </Section>

        <Section title="Outreach signature" description="Added to the end of every draft." onSave={() => save("outreach", outreach)} saving={saving === "outreach"}>
          <Field label="Your name" htmlFor="o-n">
            <input id="o-n" maxLength={200} value={outreach.sender_name} onChange={(e) => setOutreach({ ...outreach, sender_name: e.target.value })} className="field" />
          </Field>
          <Field label="Title" htmlFor="o-t">
            <input id="o-t" maxLength={200} value={outreach.sender_title} onChange={(e) => setOutreach({ ...outreach, sender_title: e.target.value })} className="field" />
          </Field>
          <Field label="Contact line" htmlFor="o-c">
            <input id="o-c" maxLength={200} value={outreach.contact_line} onChange={(e) => setOutreach({ ...outreach, contact_line: e.target.value })} className="field" />
          </Field>
        </Section>

        <div id="autosend" className="scroll-mt-24 lg:col-span-2">
          <Section
            title="Automatic outreach"
            description="Emails go only to Qualified prospects with a public business email who have never been contacted. WhatsApp messages are prepared for you to send yourself; nothing is ever sent on WhatsApp automatically."
            onSave={() => save("autosend", autosend)}
            saving={saving === "autosend"}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Send emails automatically</span>
              <Switch checked={autosend.email_enabled} onChange={(v) => setAutosend({ ...autosend, email_enabled: v })} label="Send emails automatically" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Prepare WhatsApp messages for prospects without an email</span>
              <Switch checked={autosend.whatsapp_drafts} onChange={(v) => setAutosend({ ...autosend, whatsapp_drafts: v })} label="Prepare WhatsApp messages" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Also prepare WhatsApp messages for “Needs review” prospects</span>
              <Switch checked={autosend.whatsapp_include_review} onChange={(v) => setAutosend({ ...autosend, whatsapp_include_review: v })} label="Include Needs review prospects" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Weekdays only</span>
              <Switch checked={autosend.weekdays_only} onChange={(v) => setAutosend({ ...autosend, weekdays_only: v })} label="Send on weekdays only" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Send emails from (hour, Lagos time)" htmlFor="as-start">
                <input id="as-start" type="number" min={0} max={23} value={autosend.window_start_hour} onChange={(e) => setAutosend({ ...autosend, window_start_hour: Number(e.target.value) })} className="field" />
              </Field>
              <Field label="Until (hour, Lagos time)" htmlFor="as-end">
                <input id="as-end" type="number" min={1} max={24} value={autosend.window_end_hour} onChange={(e) => setAutosend({ ...autosend, window_end_hour: Number(e.target.value) })} className="field" />
              </Field>
            </div>
            <p className="text-xs text-muted">The daily email limit is under “Daily limits” (Automatic emails / day). The scheduler runs around 08:00, 13:00 and 17:00 Lagos time and sends a share of the limit each time.</p>
          </Section>
        </div>

        <Section title="Audits" onSave={() => save("audit", audit)} saving={saving === "audit"}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Run Google PageSpeed during audits</span>
            <Switch checked={audit.use_pagespeed} onChange={(v) => setAudit({ ...audit, use_pagespeed: v })} label="Run Google PageSpeed during audits" />
          </div>
          <Field label="Internal links checked per site" htmlFor="a-l">
            <input id="a-l" type="number" min={0} max={40} value={audit.max_links_checked} onChange={(e) => setAudit({ ...audit, max_links_checked: Number(e.target.value) })} className="field" />
          </Field>
        </Section>
      </div>

      <Section
        title="Scheduled searches"
        description="Saved searches the scheduler runs automatically (once per chosen time slot). New prospects land in your CRM for review; nothing is sent."
        onSave={() => save("schedules", schedules)}
        saving={saving === "schedules"}
      >
        {schedules.length === 0 && <p className="text-sm text-muted">No scheduled searches.</p>}
        {schedules.map((s, index) => {
          const update = (patch: Partial<Schedule>) => setSchedules(schedules.map((x, j) => (j === index ? { ...x, ...patch } : x)));
          const updateParams = (patch: Partial<Schedule["params"]>) => update({ params: { ...s.params, ...patch } });
          return (
            <fieldset key={s.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <legend className="sr-only">{s.name || "Schedule"}</legend>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Name" htmlFor={`sc-n-${s.id}`} className="min-w-48 flex-1">
                  <input id={`sc-n-${s.id}`} maxLength={80} value={s.name} onChange={(e) => update({ name: e.target.value })} className="field" />
                </Field>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <Switch checked={s.enabled} onChange={(v) => update({ enabled: v })} label="Enabled" /> Enabled
                </label>
                <button type="button" onClick={() => setSchedules(schedules.filter((_, j) => j !== index))} className={buttonClass("ghost", "sm", "mb-1 !px-3")}>
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="State" htmlFor={`sc-s-${s.id}`}>
                  <select id={`sc-s-${s.id}`} value={s.params.state} onChange={(e) => updateParams({ state: e.target.value })} className="field">
                    <option value="">Any</option>
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                </Field>
                <Field label="City" htmlFor={`sc-c-${s.id}`}>
                  <input id={`sc-c-${s.id}`} value={s.params.city} onChange={(e) => updateParams({ city: e.target.value })} className="field" />
                </Field>
                <Field label="Prospects per run" htmlFor={`sc-b-${s.id}`}>
                  <input id={`sc-b-${s.id}`} type="number" min={1} max={limits.max_discovery_batch} value={s.params.batch} onChange={(e) => updateParams({ batch: Number(e.target.value) })} className="field" />
                </Field>
                <Field label="Industry" htmlFor={`sc-i-${s.id}`}>
                  <select id={`sc-i-${s.id}`} value={s.params.industries[0] ?? ""} onChange={(e) => updateParams({ industries: e.target.value ? [e.target.value] : [] })} className="field">
                    <option value="">All industries</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind}>{ind}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Website" htmlFor={`sc-w-${s.id}`}>
                  <select id={`sc-w-${s.id}`} value={s.params.websiteFilter} onChange={(e) => updateParams({ websiteFilter: e.target.value })} className="field">
                    <option value="any">Any</option>
                    <option value="without_website">No website listed</option>
                    <option value="with_website">Has a website</option>
                  </select>
                </Field>
                <Field label="How often" htmlFor={`sc-f-${s.id}`}>
                  <select id={`sc-f-${s.id}`} value={s.frequency === "weekly" ? String(s.weekday) : "daily"} onChange={(e) => (e.target.value === "daily" ? update({ frequency: "daily" }) : update({ frequency: "weekly", weekday: Number(e.target.value) }))} className="field">
                    <option value="daily">Every day</option>
                    {WEEKDAYS.map((d, n) => (
                      <option key={d} value={n}>
                        Every {d}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {SLOTS.map((slot) => (
                  <label key={slot.value} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={s.slots.includes(slot.value)}
                      onChange={(e) => update({ slots: e.target.checked ? [...s.slots, slot.value] : s.slots.filter((x) => x !== slot.value) })}
                    />
                    {slot.label}
                  </label>
                ))}
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={s.params.verify} onChange={(e) => updateParams({ verify: e.target.checked })} />
                  Check websites afterwards
                </label>
              </div>
            </fieldset>
          );
        })}
        <button
          type="button"
          disabled={schedules.length >= 20}
          onClick={() =>
            setSchedules([
              ...schedules,
              {
                id: Math.random().toString(36).slice(2, 10),
                name: "Abuja schools without websites",
                enabled: true,
                frequency: "weekly",
                weekday: 0,
                slots: ["morning"],
                params: { country: "Nigeria", state: "Federal Capital Territory", city: "Abuja", industries: ["Education"], websiteFilter: "without_website", batch: 20, verify: true },
              },
            ])
          }
          className={buttonClass("secondary", "sm", "w-fit")}
        >
          <Plus className="h-4 w-4" aria-hidden /> Add a scheduled search
        </button>
      </Section>
    </div>
  );
}
