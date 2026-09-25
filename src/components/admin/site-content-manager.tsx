"use client";

import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { Field } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export type SiteContentValues = {
  availabilityStatus: string;
  heroHeadline: string;
  heroIntro: string;
  aboutBio: string;
  contactEmail: string;
  whatsappNumber: string;
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  footerBio: string;
};

export type StatOverrideValues = {
  projectsDeliveredOverride: string;
  clientReviewsOverride: string;
  serviceCategoriesOverride: string;
  averageRatingOverride: string;
};

function toOverridePayload(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

const SECTIONS = [
  { id: "hero", label: "Homepage hero" },
  { id: "about", label: "About" },
  { id: "brand", label: "Branding & SEO" },
  { id: "contact", label: "Contact" },
  { id: "stats", label: "Stat overrides" },
];

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-2xl border border-line bg-raised">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 id={`${id}-title`} className="text-sm font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export function SiteContentManager({
  initialValues,
  initialStatOverrides,
}: {
  initialValues: SiteContentValues;
  initialStatOverrides: StatOverrideValues;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState({ values: initialValues, stats: initialStatOverrides });
  const [values, setValues] = useState(initialValues);
  const [statOverrides, setStatOverrides] = useState(initialStatOverrides);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const f = (name: string) => `${id}-${name}`;

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(saved.values) || JSON.stringify(statOverrides) !== JSON.stringify(saved.stats),
    [values, statOverrides, saved]
  );

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function update<K extends keyof SiteContentValues>(key: K, value: SiteContentValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  function updateStat<K extends keyof StatOverrideValues>(key: K, value: StatOverrideValues[K]) {
    setStatOverrides((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await adminRequest("/api/settings", {
        method: "PATCH",
        body: {
          ...values,
          projectsDeliveredOverride: toOverridePayload(statOverrides.projectsDeliveredOverride),
          clientReviewsOverride: toOverridePayload(statOverrides.clientReviewsOverride),
          serviceCategoriesOverride: toOverridePayload(statOverrides.serviceCategoriesOverride),
          averageRatingOverride: toOverridePayload(statOverrides.averageRatingOverride),
        },
      });
      setSaved({ values, stats: statOverrides });
      toast.success("Site content saved. It's live now.");
      router.refresh();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const text = (key: keyof SiteContentValues, label: string, max: number, hint?: ReactNode, extra?: { placeholder?: string }) => (
    <Field label={label} htmlFor={f(key)} count={[values[key].length, max]} hint={hint}>
      <input
        id={f(key)}
        required
        maxLength={max}
        value={values[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={extra?.placeholder}
        className="field"
      />
    </Field>
  );
  const area = (key: keyof SiteContentValues, label: string, max: number, rows: number, hint?: ReactNode) => (
    <Field label={label} htmlFor={f(key)} count={[values[key].length, max]} hint={hint}>
      <textarea
        id={f(key)}
        required
        rows={rows}
        maxLength={max}
        value={values[key]}
        onChange={(e) => update(key, e.target.value)}
        className="field resize-y"
      />
    </Field>
  );
  const stat = (key: keyof StatOverrideValues, label: string, extra: { max?: number; step?: number } = {}) => (
    <Field label={label} htmlFor={f(key)}>
      <input
        id={f(key)}
        type="number"
        min={0}
        max={extra.max}
        step={extra.step ?? 1}
        value={statOverrides[key]}
        onChange={(e) => updateStat(key, e.target.value)}
        placeholder="Auto (live value)"
        className="field"
      />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
      <nav aria-label="Sections" className="hidden lg:block">
        <ul className="sticky top-24 flex flex-col gap-0.5">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/[0.03] hover:text-fg"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-5">
        <Section id="hero" title="Homepage hero" description="The first thing visitors read.">
          {text("availabilityStatus", "Availability badge", 100, "The small pill above the headline.", { placeholder: "Open for new projects" })}
          {text("heroHeadline", "Headline", 150, "Plain text. Each word animates in on load.")}
          {area("heroIntro", "Intro paragraph", 600, 3)}
        </Section>

        <Section id="about" title="About" description="Used on the About page, and its first paragraph on the homepage.">
          {area("aboutBio", "Bio", 4000, 9, "Separate paragraphs with a blank line. The first paragraph is shown largest.")}
        </Section>

        <Section id="brand" title="Branding & SEO" description="Browser tabs, search results and link previews.">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("siteName", "Site name", 100)}
            {text("siteTagline", "Tagline", 100)}
          </div>
          {area("siteDescription", "Site description", 300, 2, "The summary search engines and social previews show.")}
          {area("footerBio", "Footer text", 300, 2, "The short line under your name in the footer.")}
        </Section>

        <Section id="contact" title="Contact" description="Used by every contact link and the WhatsApp booking flow.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Contact email" htmlFor={f("contactEmail")}>
              <input
                id={f("contactEmail")}
                required
                type="email"
                value={values.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                className="field"
              />
            </Field>
            <Field label="WhatsApp number" htmlFor={f("whatsappNumber")} hint="Digits only, with country code. No + or spaces.">
              <input
                id={f("whatsappNumber")}
                required
                inputMode="numeric"
                pattern="\d{6,15}"
                value={values.whatsappNumber}
                onChange={(e) => update("whatsappNumber", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="2349065606430"
                className="field font-mono"
              />
            </Field>
          </div>
        </Section>

        <Section
          id="stats"
          title="Stat overrides"
          description="Leave blank to use the real, live-computed value. Only fill one in if you have a genuine number the site can't count."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {stat("projectsDeliveredOverride", "Projects delivered")}
            {stat("clientReviewsOverride", "Client reviews")}
            {stat("serviceCategoriesOverride", "Service categories")}
            {stat("averageRatingOverride", "Average rating", { max: 5, step: 0.1 })}
          </div>
        </Section>

        {/* Sticky save bar */}
        <div className="sticky bottom-3 z-30 mt-2">
          <div className="edge relative flex flex-col gap-3 rounded-2xl px-4 py-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm" aria-live="polite">
              {error ? (
                <span className="text-red-300">{error}</span>
              ) : isDirty ? (
                <span className="flex items-center gap-2 text-amber-300">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                  Unsaved changes
                </span>
              ) : (
                <span className="text-muted">All changes saved</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!isDirty || isSubmitting}
                onClick={() => {
                  setValues(saved.values);
                  setStatOverrides(saved.stats);
                  setError("");
                }}
                className={buttonClass("secondary", "sm")}
              >
                Discard
              </button>
              <button type="submit" disabled={!isDirty || isSubmitting} className={buttonClass("primary", "sm")}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
