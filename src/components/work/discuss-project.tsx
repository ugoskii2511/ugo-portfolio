"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, MessageCircle, Send, X } from "lucide-react";
import { buttonClass, ButtonArrow, type ButtonSize, type ButtonVariant } from "@/components/site/button";
import { trackEvent } from "@/lib/track";

export type InquiryOptions = {
  /// Website types to choose from (package labels), plus "Other / not sure".
  websiteTypes: string[];
  disclaimer: string;
};

const BUDGETS = ["₦150,000–₦250,000", "₦250,000–₦500,000", "₦500,000–₦1,000,000", "Above ₦1,000,000", "Not sure yet"];
const DEADLINES = ["As soon as possible", "Within 2 weeks", "Within a month", "1–3 months", "Flexible"];

type Status = "idle" | "submitting" | "success" | "error";

/// "Discuss a Similar Project": opens an enquiry form that is saved to the
/// admin Leads inbox. It only reports success when the server confirms it.
export function DiscussProjectButton({
  options,
  projectName,
  defaultType,
  children = "Discuss a Similar Project",
  variant = "primary",
  size = "md",
  className,
}: {
  options: InquiryOptions;
  projectName?: string;
  defaultType?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen(true);
          trackEvent("BOOKING_CLICK", `similar:${projectName ?? "general"}`);
        }}
        className={buttonClass(variant, size, className)}
      >
        {children}
        <ButtonArrow kind="right" />
      </button>
      {open && (
        <InquiryDialog
          options={options}
          projectName={projectName}
          defaultType={defaultType}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function InquiryDialog({ options, projectName, defaultType, onClose }: { options: InquiryOptions; projectName?: string; defaultType?: string; onClose: () => void }) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState({
    clientName: "",
    email: "",
    phone: "",
    projectType: defaultType && options.websiteTypes.includes(defaultType) ? defaultType : "",
    budget: "",
    deadline: "",
    features: "",
    details: "",
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));

  // Escape closes, focus stays inside the dialog, page doesn't scroll behind it.
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog) {
        const focusable = [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([tabindex='-1']), select, textarea")];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!acknowledged) {
      setStatus("error");
      setError("Please confirm you understand the prices shown are estimates.");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, sourceProject: projectName ?? "", estimateAcknowledged: true, honeypot }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; whatsappUrl?: string; issues?: { fieldErrors?: Record<string, string[]> } } | null;
      if (!response.ok) {
        const fieldError = data?.issues?.fieldErrors ? Object.values(data.issues.fieldErrors).flat()[0] : undefined;
        throw new Error(fieldError ?? data?.error ?? "Your message couldn't be sent. Please try again.");
      }
      setWhatsappUrl(data?.whatsappUrl ?? "");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof TypeError
          ? "Couldn't reach the server. Check your connection and try again. Nothing was sent."
          : err instanceof Error
            ? err.message
            : "Your message couldn't be sent. Please try again."
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="edge relative z-10 max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-t-[1.4rem] p-6 text-fg sm:max-h-[calc(100svh-2rem)] sm:rounded-[1.4rem] sm:p-8"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-fg">
          <X className="h-5 w-5" aria-hidden />
        </button>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center" role="status">
            <CheckCircle2 className="h-14 w-14 text-accent-bright" aria-hidden />
            <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
              Thanks, your enquiry was sent
            </h2>
            <p className="max-w-sm text-sm text-muted">
              I&apos;ll review what you need and reply by email or WhatsApp with questions and a proper quotation. Nothing is agreed until we&apos;ve confirmed the scope and price together.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                  <MessageCircle className="h-4 w-4" aria-hidden /> Also message on WhatsApp
                </a>
              )}
              <button type="button" onClick={onClose} className={buttonClass("primary", "md")}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate={false}>
            <div className="pr-10">
              <p className="label-mono">{projectName ? `Like ${projectName}` : "New project"}</p>
              <h2 id={`${id}-title`} className="mt-3 text-2xl font-semibold tracking-tight">
                Discuss a similar project
              </h2>
              <p className="mt-1 text-sm text-muted">Tell me what you need. Your details are only visible to me.</p>
            </div>
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
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-fg/90">Your name</span>
                <input required minLength={2} maxLength={100} autoComplete="name" value={values.clientName} onChange={set("clientName")} className="field" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg/90">Email address</span>
                <input required type="email" maxLength={200} autoComplete="email" value={values.email} onChange={set("email")} className="field" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg/90">Phone or WhatsApp</span>
                <input required type="tel" inputMode="tel" maxLength={40} pattern="[+0-9][0-9 ()\-]{6,}" autoComplete="tel" value={values.phone} onChange={set("phone")} className="field" placeholder="0803 123 4567" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg/90">Type of website</span>
                <select required value={values.projectType} onChange={set("projectType")} className="field">
                  <option value="" disabled>
                    Choose one
                  </option>
                  {options.websiteTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                  <option>Other / not sure</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg/90">Approximate budget</span>
                <select required value={values.budget} onChange={set("budget")} className="field">
                  <option value="" disabled>
                    Choose one
                  </option>
                  {BUDGETS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-fg/90">
                  Desired deadline <span className="font-normal text-faint">(optional)</span>
                </span>
                <select value={values.deadline} onChange={set("deadline")} className="field">
                  <option value="">Not decided</option>
                  {DEADLINES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg/90">
                Features you need <span className="font-normal text-faint">(optional)</span>
              </span>
              <textarea rows={3} maxLength={2000} value={values.features} onChange={set("features")} className="field resize-y" placeholder="e.g. online payments, booking calendar, admin dashboard" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg/90">
                Anything else? <span className="font-normal text-faint">(optional)</span>
              </span>
              <textarea rows={3} maxLength={3000} value={values.details} onChange={set("details")} className="field resize-y" />
            </label>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm">
              <p className="font-semibold text-amber-200">Important Pricing Notice</p>
              <p className="mt-1.5 max-h-32 overflow-y-auto pr-1 text-xs leading-relaxed text-fg/80 sm:max-h-none sm:overflow-visible">{options.disclaimer}</p>
              <label className="mt-3 flex items-start gap-2.5">
                <input type="checkbox" required checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
                <span>I understand that the prices shown are estimates, and that the final price is agreed after we discuss the project.</span>
              </label>
            </div>
            {status === "error" && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:bg-[#4f79ff] disabled:opacity-60"
            >
              {status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              {status === "submitting" ? "Sending…" : "Send enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
