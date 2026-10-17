"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

export function AuditRequestForm() {
  const [values, setValues] = useState({ name: "", businessName: "", email: "", phone: "", website: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/audit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, consent, honeypot }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const field = data?.issues?.fieldErrors && Object.values(data.issues.fieldErrors as Record<string, string[]>).flat()[0];
        throw new Error(field ?? data?.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
        <CheckCircle2 className="h-14 w-14 text-accent-bright" aria-hidden />
        <h2 className="text-xl font-semibold">Request received</h2>
        <p className="max-w-sm text-sm text-muted">
          Thanks. I&apos;ll look at {values.website ? "your website" : "your business"} myself and email you what I find. There&apos;s no
          automated report and no obligation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate={false}>
      <input
        type="text"
        name="company"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg/90">Your name</span>
          <input required minLength={2} maxLength={100} autoComplete="name" value={values.name} onChange={set("name")} className="field" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg/90">Business name</span>
          <input required minLength={2} maxLength={200} autoComplete="organization" value={values.businessName} onChange={set("businessName")} className="field" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg/90">Email</span>
          <input required type="email" maxLength={200} autoComplete="email" value={values.email} onChange={set("email")} className="field" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg/90">
            Phone / WhatsApp <span className="font-normal text-faint">(optional)</span>
          </span>
          <input type="tel" maxLength={60} autoComplete="tel" value={values.phone} onChange={set("phone")} className="field" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-fg/90">
          Website <span className="font-normal text-faint">(leave empty if you don&apos;t have one yet)</span>
        </span>
        <input inputMode="url" maxLength={500} placeholder="yourbusiness.com" value={values.website} onChange={set("website")} className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-fg/90">
          Anything you&apos;d like me to look at? <span className="font-normal text-faint">(optional)</span>
        </span>
        <textarea maxLength={2000} rows={4} value={values.message} onChange={set("message")} className="field resize-none" />
      </label>
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
        <span>I agree to be contacted about this audit by email or phone. Your details are only used for this request.</span>
      </label>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:bg-[#4f79ff] disabled:opacity-60"
      >
        {status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        Request my free audit
      </button>
    </form>
  );
}
