"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/components/admin/toast-provider";

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

export function SiteContentManager({
  initialValues,
  initialStatOverrides,
}: {
  initialValues: SiteContentValues;
  initialStatOverrides: StatOverrideValues;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initialValues);
  const [statOverrides, setStatOverrides] = useState(initialStatOverrides);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function update<K extends keyof SiteContentValues>(key: K, value: SiteContentValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function updateStat<K extends keyof StatOverrideValues>(key: K, value: StatOverrideValues[K]) {
    setStatOverrides((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          projectsDeliveredOverride: toOverridePayload(statOverrides.projectsDeliveredOverride),
          clientReviewsOverride: toOverridePayload(statOverrides.clientReviewsOverride),
          serviceCategoriesOverride: toOverridePayload(statOverrides.serviceCategoriesOverride),
          averageRatingOverride: toOverridePayload(statOverrides.averageRatingOverride),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Something went wrong.");
      }

      toast.success("Site content updated.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6">
        <h2 className="font-semibold">Hero Section</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Availability badge</span>
          <input
            required
            maxLength={100}
            value={values.availabilityStatus}
            onChange={(event) => update("availabilityStatus", event.target.value)}
            placeholder="Open for New Projects"
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
          <span className="text-xs text-foreground/50">
            Shown in the pill badge at the top of the homepage hero.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Hero headline</span>
          <input
            required
            maxLength={150}
            value={values.heroHeadline}
            onChange={(event) => update("heroHeadline", event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
          <span className="text-xs text-foreground/50">
            The big headline at the top of the homepage. Plain text — no partial bold/italic
            styling.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Hero intro paragraph</span>
          <textarea
            required
            rows={3}
            maxLength={600}
            value={values.heroIntro}
            onChange={(event) => update("heroIntro", event.target.value)}
            className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
        </label>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6">
        <h2 className="font-semibold">About Page</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Bio</span>
          <textarea
            required
            rows={8}
            maxLength={4000}
            value={values.aboutBio}
            onChange={(event) => update("aboutBio", event.target.value)}
            className="resize-y rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
          <span className="text-xs text-foreground/50">
            Separate paragraphs with a blank line.
          </span>
        </label>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6">
        <h2 className="font-semibold">Stats Overrides</h2>
        <p className="text-xs text-foreground/50">
          Leave any field blank to show the real, live-computed number (counted from your
          actual projects/reviews). Only set one of these if you have a real figure that isn&apos;t
          captured by counting rows on this site.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Projects delivered</span>
            <input
              type="number"
              min={0}
              value={statOverrides.projectsDeliveredOverride}
              onChange={(event) => updateStat("projectsDeliveredOverride", event.target.value)}
              placeholder="Auto (live count)"
              className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Client reviews</span>
            <input
              type="number"
              min={0}
              value={statOverrides.clientReviewsOverride}
              onChange={(event) => updateStat("clientReviewsOverride", event.target.value)}
              placeholder="Auto (live count)"
              className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Service categories</span>
            <input
              type="number"
              min={0}
              value={statOverrides.serviceCategoriesOverride}
              onChange={(event) => updateStat("serviceCategoriesOverride", event.target.value)}
              placeholder="Auto (live count)"
              className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Average rating</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={statOverrides.averageRatingOverride}
              onChange={(event) => updateStat("averageRatingOverride", event.target.value)}
              placeholder="Auto (live average)"
              className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
            />
          </label>
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6">
        <h2 className="font-semibold">Contact Info</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Contact email</span>
          <input
            required
            type="email"
            value={values.contactEmail}
            onChange={(event) => update("contactEmail", event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">WhatsApp number</span>
          <input
            required
            value={values.whatsappNumber}
            onChange={(event) => update("whatsappNumber", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="2349065606430"
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
          <span className="text-xs text-foreground/50">
            Digits only, country code included, no + or spaces. Used for every booking link
            sitewide.
          </span>
        </label>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6">
        <h2 className="font-semibold">Branding</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Site name</span>
          <input
            required
            maxLength={100}
            value={values.siteName}
            onChange={(event) => update("siteName", event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
          <span className="text-xs text-foreground/50">
            Used in the browser tab title, search results, and social share previews.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Tagline</span>
          <input
            required
            maxLength={100}
            value={values.siteTagline}
            onChange={(event) => update("siteTagline", event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Site description</span>
          <textarea
            required
            rows={2}
            maxLength={300}
            value={values.siteDescription}
            onChange={(event) => update("siteDescription", event.target.value)}
            className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
          <span className="text-xs text-foreground/50">
            Used for search engine results and social share previews.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Footer bio</span>
          <textarea
            required
            rows={2}
            maxLength={300}
            value={values.footerBio}
            onChange={(event) => update("footerBio", event.target.value)}
            className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
          <span className="text-xs text-foreground/50">
            Short blurb shown under your name in the site footer.
          </span>
        </label>
      </div>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Changes
      </button>
    </form>
  );
}
