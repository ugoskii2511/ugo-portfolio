"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, Panel, PanelHeader } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export type ReceiptSettingsValues = {
  businessName: string;
  logoUrl: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  currency: string;
  currencySymbol: string;
  numberPrefix: string;
  authorizedName: string;
  authorizedTitle: string;
  acknowledgement: string;
  footerNote: string;
};

/// Empty fields fall back to the site's own details (shown as placeholders).
export function ReceiptSettingsForm({ initial, fallback }: { initial: ReceiptSettingsValues; fallback: Partial<Record<keyof ReceiptSettingsValues, string>> }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = (key: keyof ReceiptSettingsValues, label: string, props: { type?: string; maxLength?: number; hint?: string; required?: boolean } = {}) => (
    <Field label={label} htmlFor={`rs-${key}`} hint={props.hint}>
      <input
        id={`rs-${key}`}
        type={props.type ?? "text"}
        maxLength={props.maxLength ?? 200}
        required={props.required}
        value={v[key]}
        placeholder={fallback[key] ?? ""}
        onChange={(e) => setV((x) => ({ ...x, [key]: e.target.value }))}
        className="field"
      />
    </Field>
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim() === "" ? null : val.trim()]));
      await adminRequest("/api/admin/receipts/settings", { method: "PUT", body: { ...body, currency: v.currency.trim().toUpperCase() || "NGN", currencySymbol: v.currencySymbol.trim() || "₦", numberPrefix: v.numberPrefix.trim() || "RCT" } });
      toast.success("Receipt settings saved. New receipts will use them.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Panel>
        <PanelHeader title="Your business" description="Printed at the top of every new receipt. Leave a field empty to use your site's details (shown greyed out)." />
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          {input("businessName", "Business name")}
          {input("logoUrl", "Logo", { maxLength: 500, hint: "A site path like /logo.jpg, or an https:// link to a PNG or JPG." })}
          {input("email", "Email", { type: "email" })}
          {input("phone", "Phone", { maxLength: 60 })}
          {input("website", "Website")}
          <Field label="Address" htmlFor="rs-address">
            <textarea id="rs-address" rows={2} maxLength={500} value={v.address} placeholder={fallback.address ?? ""} onChange={(e) => setV((x) => ({ ...x, address: e.target.value }))} className="field" />
          </Field>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Numbers and currency" />
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          {input("numberPrefix", "Receipt number prefix", { maxLength: 8, hint: `Numbers look like ${(v.numberPrefix || "RCT").toUpperCase()}-${new Date().getFullYear()}-0001.` })}
          {input("currency", "Currency code", { maxLength: 3, hint: "e.g. NGN" })}
          {input("currencySymbol", "Currency symbol", { maxLength: 4, hint: "e.g. ₦" })}
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">Changing the currency only changes how new receipts are labelled; amounts aren&apos;t converted. Numbers already issued never change.</p>
      </Panel>
      <Panel>
        <PanelHeader title="Wording and signature" />
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          {input("authorizedName", "Authorized representative")}
          {input("authorizedTitle", "Their title", { maxLength: 120, hint: "e.g. Founder" })}
          <Field label="Acknowledgement" htmlFor="rs-ack" className="sm:col-span-2">
            <textarea id="rs-ack" rows={3} maxLength={1000} value={v.acknowledgement} placeholder={fallback.acknowledgement ?? ""} onChange={(e) => setV((x) => ({ ...x, acknowledgement: e.target.value }))} className="field" />
          </Field>
          <div className="sm:col-span-2">{input("footerNote", "Footer note (optional)", { maxLength: 300, hint: "e.g. bank details or “Thank you for your business”." })}</div>
        </div>
      </Panel>
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <div>
        <button type="submit" disabled={busy} className={buttonClass("primary", "md")}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
