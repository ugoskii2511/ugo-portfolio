import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/admin/ui";
import { callProspector, prospectorConfigured } from "@/lib/prospector";
import { stageLabel } from "@/lib/crm";
import { WEBSITE_STATUS } from "@/lib/prospect-meta";

export const metadata: Metadata = { title: "How client finding works" };

/// A plain-English walkthrough of the client-acquisition tools. Numbers that
/// can be changed in Prospector settings are read live, so the guide always
/// matches how the system is actually configured.

type Scoring = {
  weights: Record<string, number>;
  qualified_threshold: number;
  review_threshold: number;
  recent_contact_days: number;
  target_locations: string[];
  target_industries: string[];
};
type LiveSettings = {
  scoring: Scoring;
  followups: { schedule_days: number[] };
  retention: { archive_uncontacted_after_days: number; delete_archived_after_days: number };
  limits: Record<string, number>;
};

// Same defaults as prospector/app/settings.py, used if the service can't be reached.
const DEFAULTS: LiveSettings = {
  scoring: {
    weights: {
      no_website: 35,
      website_unreachable: 30,
      no_https: 15,
      not_mobile_friendly: 15,
      slow_performance: 10,
      missing_title_or_description: 6,
      high_priority_finding: 6,
      medium_priority_finding: 3,
      contact_channel: 10,
      target_location: 10,
      target_industry: 10,
      recently_contacted: -40,
    },
    qualified_threshold: 60,
    review_threshold: 35,
    recent_contact_days: 60,
    target_locations: ["Abuja", "Federal Capital Territory", "FCT"],
    target_industries: [],
  },
  followups: { schedule_days: [4, 10] },
  retention: { archive_uncontacted_after_days: 180, delete_archived_after_days: 365 },
  limits: { max_discovery_batch: 150, max_audit_batch: 30, overpass_per_day: 60, site_fetch_per_day: 1500, pagespeed_per_day: 150 },
};

async function loadSettings(): Promise<{ settings: LiveSettings; live: boolean }> {
  if (!prospectorConfigured()) return { settings: DEFAULTS, live: false };
  try {
    const data = await callProspector<{ settings: LiveSettings }>("/settings", { timeoutMs: 8000 });
    return { settings: data.settings, live: true };
  } catch {
    return { settings: DEFAULTS, live: false };
  }
}

const SECTIONS = [
  { id: "overview", title: "The big picture" },
  { id: "routine", title: "A simple weekly routine" },
  { id: "find", title: "1. Finding businesses" },
  { id: "website", title: "2. Website checks" },
  { id: "audit", title: "3. Website audits" },
  { id: "score", title: "4. Lead scores" },
  { id: "outreach", title: "5. Reaching out" },
  { id: "followups", title: "6. Follow-ups and replies" },
  { id: "pipeline", title: "7. The pipeline and deals" },
  { id: "inbound", title: "8. The free audit form" },
  { id: "automation", title: "9. What runs automatically" },
  { id: "privacy", title: "10. Do-not-contact, archiving and data" },
  { id: "troubleshooting", title: "Troubleshooting" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Panel as="section" aria-labelledby={`${id}-title`} className="scroll-mt-24 p-5 sm:p-6" id={id}>
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-fg/85">{children}</div>
    </Panel>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-mono text-[0.7rem] text-accent-bright">
            {index + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "warning" }) {
  return (
    <p
      className={
        tone === "warning"
          ? "rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-100"
          : "rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-fg/90"
      }
    >
      {children}
    </p>
  );
}

function Go({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-accent-bright underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FLOW = [
  { title: "Find", text: "Pull real businesses from public listings, or add your own." },
  { title: "Check", text: "See whether each one has a working website." },
  { title: "Audit", text: "Look at the website's real problems." },
  { title: "Score", text: "Rank who most likely needs your help." },
  { title: "Reach out", text: "Emails go out automatically; WhatsApp messages wait for you to send." },
  { title: "Follow up & win", text: "Get reminders, log replies, track the deal." },
];

const STAGE_HELP: Record<string, string> = {
  DISCOVERED: "Just added. Not enough known yet, or a low score.",
  NEEDS_REVIEW: "Worth a look. Decide yourself whether to pursue them.",
  QUALIFIED: "High score: a strong candidate for outreach.",
  READY_FOR_OUTREACH: "You've decided to contact them (set this yourself).",
  CONTACTED: "You logged a message as sent. Follow-ups are scheduled.",
  REPLIED: "They answered. Follow-up reminders stop automatically.",
  CONSULTATION_SCHEDULED: "A call or meeting is booked.",
  PROPOSAL_SENT: "You've sent a quote or proposal.",
  NEGOTIATION: "Discussing price or scope.",
  WON: "They became a client. Record the amount for your revenue total.",
  LOST: "Didn't go ahead. Note why, to learn from it.",
  DO_NOT_CONTACT: "Never contact again. Set with the Do not contact button.",
};

export default async function ClientsGuidePage() {
  const { settings, live } = await loadSettings();
  const w = settings.scoring.weights;
  const s = settings.scoring;
  const days = settings.followups.schedule_days;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clients · Guide"
        title="How client finding works"
        description="A walkthrough of every part of the client tools: what each page does, what the labels mean, and the order to use them in."
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Guide contents" className="lg:sticky lg:top-24 lg:self-start">
          <Panel className="p-4">
            <p className="label-mono !text-[0.6rem]">On this page</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-muted hover:text-fg">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          <Section id="overview" title="The big picture">
            <p>
              This part of your dashboard helps you find local businesses that need a website (or a better one), and keeps track of
              every conversation until they become a client. Every business, website status and number comes from a real source:
              nothing is made up. <strong>Emails</strong> to qualified businesses can go out automatically (within a small daily limit, once
              email is set up); <strong>WhatsApp messages</strong> are only ever prepared, and you send them yourself.
            </p>
            <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {FLOW.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-line p-4">
                  <p className="font-mono text-xs text-accent-bright">Step {i + 1}</p>
                  <p className="mt-1 font-semibold">{step.title}</p>
                  <p className="mt-1 text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
            <p>
              The pages in the sidebar follow the same order: <Go href="/admin/clients/find">Find clients</Go>, then{" "}
              <Go href="/admin/clients/prospects">Prospects</Go> (each business has its own page where most of the work happens),{" "}
              <Go href="/admin/clients/outreach">Outreach</Go> for messages, <Go href="/admin/clients/pipeline">Pipeline board</Go> to see
              everyone by stage, and <Go href="/admin/clients">Client pipeline</Go> for the numbers.
            </p>
          </Section>

          <Section id="routine" title="A simple weekly routine">
            <Steps
              items={[
                <>
                  <strong>Find:</strong> on <Go href="/admin/clients/find">Find clients</Go>, search one area and one or two industries
                  with &ldquo;Check websites afterwards&rdquo; switched on. 20–30 businesses at a time is plenty.
                </>,
                <>
                  <strong>Audit:</strong> on <Go href="/admin/clients/audits">Website audits</Go>, click &ldquo;Audit now&rdquo; to check the
                  businesses that have a website.
                </>,
                <>
                  <strong>Pick:</strong> open <Go href="/admin/clients/prospects?stage=QUALIFIED">Qualified</Go> prospects first (highest
                  scores), then glance at <Go href="/admin/clients/prospects?stage=NEEDS_REVIEW">Needs review</Go>.
                </>,
                <>
                  <strong>Message:</strong> on a prospect&apos;s page, generate a draft, edit it, approve it, send it yourself, then click{" "}
                  <em>I sent it</em>.
                </>,
                <>
                  <strong>Follow up:</strong> check the Follow-ups box on the <Go href="/admin/clients">overview</Go> every couple of days.
                  When someone replies, log it on their page.
                </>,
              ]}
            />
          </Section>

          <Section id="find" title="1. Finding businesses">
            <p>
              <strong>It runs on its own.</strong> The <em>Autopilot</em> (Prospector settings) searches the next city × industry every
              weekday around 08:00, 13:00 and 17:00, checks each new business&apos;s website, looks on their own site for a public email
              address, and audits new websites at midday. You don&apos;t need to press anything. You can still search yourself any time:
            </p>
            <p>
              <Go href="/admin/clients/find">Find clients</Go> has three ways to add businesses (called <em>prospects</em>):
            </p>
            <Table
              head={["Option", "What it does"]}
              rows={[
                [
                  <strong key="a">Discover automatically</strong>,
                  <>
                    Searches OpenStreetMap, a free public map where businesses are listed by the community. Choose a state and city, the
                    industries you want, and whether they should already have a website. You get the business name, address, and any
                    phone, email or website they listed publicly.
                  </>,
                ],
                [<strong key="b">Add manually</strong>, "For someone you met or were referred to. Only the business name is required."],
                [
                  <strong key="c">Import CSV</strong>,
                  "Upload a spreadsheet (saved as CSV) with a business name column, plus optional website, email, phone, industry, category, address, city, state and country columns. Up to 2,000 rows at a time.",
                ],
              ]}
            />
            <p>
              While a search runs you&apos;ll see a progress card. Big searches are done in short rounds, so keep the page open until it
              says <StatusPill tone="success">done</StatusPill>. If you close it, open <Go href="/admin/clients/find">Find clients</Go>{" "}
              again and click <em>Continue</em> on the job under &ldquo;Recent jobs&rdquo;.
            </p>
            <Tip>
              Duplicates are caught automatically (same listing, same website, or same name in the same city), so running a similar
              search twice won&apos;t create copies. A business matching your do-not-contact list is saved already marked
              &ldquo;Do not contact&rdquo;, so it can never be messaged by mistake.
            </Tip>
            <Tip tone="warning">
              OpenStreetMap doesn&apos;t list every Nigerian business, so some areas return only a few results. That&apos;s a limit of
              the free data, not a fault. Try a nearby city, a whole state (leave the city blank), or more industries.
            </Tip>
          </Section>

          <Section id="website" title="2. Website checks">
            <p>
              A website check opens the business&apos;s website (or, if none is listed, tries the obvious addresses such as{" "}
              <code className="rounded bg-white/[0.06] px-1">businessname.com.ng</code>) and records what it found, with the evidence
              shown on the prospect&apos;s page. Run it from a prospect&apos;s page (&ldquo;Re-check website&rdquo; / &ldquo;Look for a
              website&rdquo;), or automatically after a search.
            </p>
            <Table
              head={["Label", "What it means"]}
              rows={[
                [<StatusPill key="v" tone={WEBSITE_STATUS.VERIFIED.tone}>{WEBSITE_STATUS.VERIFIED.label}</StatusPill>, "The listed website loads and its homepage names the business."],
                [
                  <StatusPill key="f" tone={WEBSITE_STATUS.FOUND_UNVERIFIED.tone}>{WEBSITE_STATUS.FOUND_UNVERIFIED.label}</StatusPill>,
                  "A website loads, but it's not certain it belongs to this business (e.g. the name doesn't match exactly, or the address was guessed). Open it and confirm before contacting them.",
                ],
                [<StatusPill key="n" tone={WEBSITE_STATUS.NONE_FOUND.tone}>{WEBSITE_STATUS.NONE_FOUND.label}</StatusPill>, "No website listed, and none of the likely addresses belongs to them. Often your best leads."],
                [<StatusPill key="u" tone={WEBSITE_STATUS.UNCERTAIN.tone}>{WEBSITE_STATUS.UNCERTAIN.label}</StatusPill>, "They list a website, but it didn't load (down, expired, or broken). A strong reason to reach out."],
                [<StatusPill key="c" tone={WEBSITE_STATUS.UNCHECKED.tone}>{WEBSITE_STATUS.UNCHECKED.label}</StatusPill>, "No check has run yet, or the check couldn't complete (it says why in the job log). Try again later."],
              ]}
            />
          </Section>

          <Section id="audit" title="3. Website audits">
            <p>
              For businesses that have a website, an audit looks at the homepage the way a visitor (and Google) would. Run it from a
              prospect&apos;s page or in bulk on <Go href="/admin/clients/audits">Website audits</Go>. Each check is marked{" "}
              <StatusPill tone="success">pass</StatusPill> <StatusPill tone="warning">warn</StatusPill>{" "}
              <StatusPill tone="danger">fail</StatusPill> or <StatusPill>not checked</StatusPill>, with the evidence and a suggested fix.
            </p>
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {[
                "Does the site load, and how fast does the server respond",
                "HTTPS (the padlock) and redirecting http to https",
                "Works on phones (mobile viewport)",
                "Page title and description (what Google shows)",
                "Clear calls to action and contact options (call, email, WhatsApp, forms)",
                "Broken internal links",
                "Whether search engines are blocked from the site",
                "Social share preview, image descriptions, page size, and an out-of-date copyright year",
                "Google PageSpeed mobile scores, when available",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bright" />
                  {item}
                </li>
              ))}
            </ul>
            <Tip>
              <strong>&ldquo;Not checked&rdquo; is honest, not an error.</strong> Some sites build their content in the browser, so
              their text can&apos;t be read reliably; those checks are skipped rather than guessed. Sites that ask not to be crawled
              (robots.txt) are skipped too.
            </Tip>
            <Tip tone="warning">
              Google PageSpeed often shows &ldquo;Not available&rdquo; at the moment, because Google limits free use without a key.
              Adding a free Google API key (PAGESPEED_API_KEY on the prospector service) makes speed scores reliable. Status is shown
              in <Go href="/admin/clients/settings">Prospector settings</Go>.
            </Tip>
          </Section>

          <Section id="score" title="4. Lead scores">
            <p>
              Every prospect gets a score from 0 to 100 showing how likely it is that they need your help and that you can reach them.
              The prospect&apos;s page lists exactly which points it got and why. Scores update after every check or audit, or when you
              click <em>Rescore</em>.
              {live ? " These are your current settings:" : " These are the default settings (your live settings couldn't be loaded):"}
            </p>
            <Table
              head={["What was found", "Points"]}
              rows={[
                ["No website found", `+${w.no_website}`],
                ["Listed website not loading", `+${w.website_unreachable}`],
                ["No HTTPS", `+${w.no_https}`],
                ["Not mobile-friendly", `+${w.not_mobile_friendly}`],
                ["Slow on mobile (PageSpeed)", `+${w.slow_performance}`],
                ["Missing page title or description", `+${w.missing_title_or_description}`],
                ["Each other high / medium priority issue", `+${w.high_priority_finding} / +${w.medium_priority_finding} (up to +24)`],
                ["Has a public phone or email", `+${w.contact_channel}`],
                [`In a target location (${s.target_locations.join(", ") || "none set"})`, `+${w.target_location}`],
                ["In a target industry", `+${w.target_industry}`],
                [`You contacted them in the last ${s.recent_contact_days} days`, `${w.recently_contacted}`],
              ]}
            />
            <Table
              head={["Score", "Result", "Stage it moves to"]}
              rows={[
                [`${s.qualified_threshold} or more`, "Qualified", stageLabel("QUALIFIED")],
                [`${s.review_threshold}–${s.qualified_threshold - 1}`, "Needs review", stageLabel("NEEDS_REVIEW")],
                [`Below ${s.review_threshold}`, "Low fit", stageLabel("DISCOVERED")],
              ]}
            />
            <p>
              Scores only move prospects between the first three stages. Once you&apos;ve moved someone further (e.g. Contacted), a
              new score never moves them back. If you know better than the score, type your own number in <em>Override score</em>.
              Change any of the points or targets in <Go href="/admin/clients/settings">Prospector settings</Go>.
            </p>
          </Section>

          <Section id="outreach" title="5. Reaching out">
            <p>
              <strong>Automatic emails.</strong> Once email is set up (see the Automatic email row in{" "}
              <Go href="/admin/clients/settings#autosend">Prospector settings</Go>), every prospect that has a public business
              email and has never been contacted gets one email (best scores first), sent from your address on weekdays during working hours, up to your daily
              limit (10 to start). Each email is personal to that business (it only mentions facts recorded about it), has a working
              unsubscribe link, and replies come straight to your inbox. Sent emails show up on the prospect&apos;s page and move them to
              Contacted, with follow-up reminders. Anyone who unsubscribes, bounces or marks it as spam is put on the do-not-contact list
              automatically. People who asked for a free audit are never emailed automatically: they get your personal reply. To keep every
              email truthful, it never writes about a website the system only guessed belongs to them, and if they have a working site it
              waits for that site&apos;s audit first.
            </p>
            <p>
              <strong>WhatsApp messages are prepared, never sent for you.</strong> For prospects with a Nigerian mobile number and no email,
              a short, natural message is written and placed under{" "}
              <Go href="/admin/clients/outreach?status=approved">Outreach → Ready to send</Go>. Click <strong>Open in WhatsApp</strong>,
              check it, send it from your phone, then click <strong>I sent it</strong>. (The system can&apos;t see whether a number is on
              WhatsApp; if a chat doesn&apos;t open, that number isn&apos;t.)
            </p>
            <p>For anyone else, or to write a different message yourself:</p>
            <Steps
              items={[
                <>
                  On a prospect&apos;s page, pick a template (or leave it on <em>Best fit</em>) and click <strong>Generate draft</strong>.
                  It only mentions facts recorded for that business, such as no website found or a specific audit problem, and links to
                  a relevant project from your portfolio.
                </>,
                <>Read it and edit anything you like, then click <strong>Save edits</strong>.</>,
                <>
                  Click <strong>Approve</strong>. Editing an approved draft sends it back to draft, so you always approve the final
                  wording.
                </>,
                <>
                  Send it yourself: <strong>Open in email app</strong> / <strong>Open in WhatsApp</strong> fills it in for you, or use{" "}
                  <strong>Copy</strong>.
                </>,
                <>
                  Choose how you sent it and click <strong>I sent it</strong>. This records the message, moves them to Contacted and
                  schedules follow-ups.
                </>,
              ]}
            />
            <p>
              <Go href="/admin/clients/outreach">Outreach</Go> shows what was sent today and every message by status (to approve, ready to
              send, sent, rejected), and has a <strong>Run now</strong> button. Your name and contact line at the bottom of each message are set in{" "}
              <Go href="/admin/clients/settings">Prospector settings</Go>.
            </p>
            <Tip tone="warning">
              Only contact businesses through the public channels they listed, and stop if they ask you to. Keep the daily email limit
              low at first: sending a lot from a new address is the fastest way to end up in spam folders.
            </Tip>
          </Section>

          <Section id="followups" title="6. Follow-ups and replies">
            <p>
              When you click <em>I sent it</em>, reminders are created{" "}
              <strong>{days.length ? days.map((d) => `${d} days`).join(" and ") : "(none configured)"}</strong> later. They appear in
              the Follow-ups box on the <Go href="/admin/clients">overview</Go> (red when overdue) and on the prospect&apos;s page,
              where you can mark them <em>Done</em> or <em>Skip</em>, or add your own.
            </p>
            <p>
              When someone answers, open their page, choose <strong>Log interaction → They replied</strong> and write a short summary.
              They move to <em>Replied</em> and their remaining reminders stop. Calls, meetings and proposals can be logged the same
              way, and <em>Add note</em> is for anything else you want to remember.
            </p>
          </Section>

          <Section id="pipeline" title="7. The pipeline and deals">
            <p>
              Every prospect sits in one stage. Change it with the Stage menu on their page or on the{" "}
              <Go href="/admin/clients/pipeline">Pipeline board</Go>, and every change is recorded in their history.
            </p>
            <Table head={["Stage", "Meaning"]} rows={Object.entries(STAGE_HELP).map(([stage, help]) => [<strong key={stage}>{stageLabel(stage)}</strong>, help])} />
            <p>
              In the <strong>Deal</strong> box on a prospect&apos;s page, record what you quoted (proposal amount) and what they agreed
              to pay (won amount). &ldquo;Revenue won&rdquo; on the overview is the total of won amounts you&apos;ve recorded, and
              conversion is worked out only from businesses you actually contacted.
            </p>
          </Section>

          <Section id="inbound" title="8. The free audit form">
            <p>
              Your public site has a page at{" "}
              <a href="/audit" target="_blank" rel="noopener noreferrer" className="font-medium text-accent-bright hover:underline">
                /audit
              </a>{" "}
              (linked in the footer) where any business can ask you to review their website. Each request:
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>appears in your prospects marked high priority, in <em>Needs review</em> or higher, never lower;</li>
              <li>shows their message and contact details in the prospect&apos;s history;</li>
              <li>gets a website check and audit queued, so the findings are ready when you look.</li>
            </ul>
            <p>
              These people asked to hear from you, so they&apos;re your warmest leads. The form promises a personal reply by email, so
              review their audit and write back yourself. Share the link when you talk to business owners.
            </p>
          </Section>

          <Section id="automation" title="9. What runs automatically">
            <Table
              head={["When (Lagos time, roughly)", "What happens"]}
              rows={[
                [
                  "~08:00, ~13:00, ~17:00",
                  <>
                    The <strong>Autopilot</strong> searches the next city × industry, your <strong>scheduled searches</strong> run (set them up at the bottom of{" "}
                    <Go href="/admin/clients/settings">Prospector settings</Go>: area, industry, how often, and which time slots).
                    Waiting checks and audits are worked through, then a share of the day&apos;s automatic emails is sent and new WhatsApp
                    messages are prepared.
                  </>,
                ],
                [
                  "~03:30 daily",
                  <>
                    Housekeeping: follow-ups are tidied for people who&apos;ve moved on, retention rules are applied, and websites last
                    checked over 90 days ago are re-checked.
                  </>,
                ],
              ]}
            />
            <p>
              Times can drift by up to an hour (a limit of the free hosting plan). Emails only go out inside your sending window
              (weekdays, 08:00–19:00 Lagos time by default); WhatsApp messages are never sent automatically.
            </p>
            <p>
              <strong>Daily limits</strong> keep usage of the free services polite and stop a mistake from running away: currently{" "}
              {settings.limits.overpass_per_day ?? "—"} map searches, {settings.limits.site_fetch_per_day ?? "—"} website requests and{" "}
              {settings.limits.pagespeed_per_day ?? "—"} PageSpeed tests per day. When one is reached, jobs pause (&ldquo;limit
              reached&rdquo;) and can be continued the next day. Today&apos;s usage is on the <Go href="/admin/clients">overview</Go>.
            </p>
          </Section>

          <Section id="privacy" title="10. Do-not-contact, archiving and data">
            <Table
              head={["Button", "What it does"]}
              rows={[
                [
                  <strong key="d">Do not contact</strong>,
                  "For anyone who asks you to stop. Their email, phone and website domain go on a permanent never-contact list: no drafts can be made, nothing can be marked as sent, and if a future search finds them again they arrive already marked do-not-contact. Use this rather than Delete.",
                ],
                [<strong key="a">Archive</strong>, "Hides a prospect from lists without losing anything. Restore it any time (tick “Show archived” on Prospects)."],
                [<strong key="x">Delete</strong>, "Permanently removes the prospect and all its history. The do-not-contact list is kept."],
                [<strong key="e">Export CSV</strong>, "Downloads your prospects as a spreadsheet (on the Prospects page). Exports are recorded in the audit log."],
              ]}
            />
            <p>
              Automatic clean-up: prospects you never contacted are archived after{" "}
              <strong>{settings.retention.archive_uncontacted_after_days || "never (off)"}</strong>
              {settings.retention.archive_uncontacted_after_days ? " days" : ""}, and archived ones are deleted after{" "}
              <strong>{settings.retention.delete_archived_after_days || "never (off)"}</strong>
              {settings.retention.delete_archived_after_days ? " days" : ""}. Change this in{" "}
              <Go href="/admin/clients/settings">Prospector settings</Go>.
            </p>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <Table
              head={["You see", "What to do"]}
              rows={[
                [
                  <StatusPill key="f" tone="danger">failed</StatusPill>,
                  "Something went wrong in a job. The card's log says what. Click Retry: it continues from where it stopped and never duplicates work already done.",
                ],
                ["“Paused: … limit reached”", "A daily limit was hit. Continue tomorrow, or raise the limit in Prospector settings."],
                ["A job stuck on queued / running", "Open Find clients and click Continue on the job. If another window is already running it, wait a minute."],
                ["Few or no search results", "OpenStreetMap has gaps. Widen the area, add industries, or set the website filter to Any."],
                ["“Website found, unverified”", "Open the site and check it really belongs to that business before mentioning it in a message."],
                ["PageSpeed “Not available”", "Google's free quota without a key. Add PAGESPEED_API_KEY to fix it; the other audit checks still work."],
                ["“The prospector service isn't connected”", "The site can't reach the engine that runs searches. CRM editing still works. Check PROSPECTOR_URL and PROSPECTOR_API_SECRET on Vercel."],
                ["A draft can't be generated or sent", "The business is on the do-not-contact list, or the draft isn't approved yet."],
              ]}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
