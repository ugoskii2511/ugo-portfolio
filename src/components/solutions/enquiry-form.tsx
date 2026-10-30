"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { clsx } from "clsx";
import { buttonClass } from "@/components/site/button";
import { BUDGET_OPTIONS, SOLUTIONS, TIMELINE_OPTIONS, getSolutionByKey, type SolutionField } from "@/lib/solutions";
import { COMPLEXITY, ESTIMATE_DISCLAIMER, type Complexity } from "@/lib/solution-pricing";
import { estimate, formatNaira, type Answers } from "@/lib/solution-estimate";
import { CardPreview } from "@/components/solutions/card-preview";

type Contact = { fullName: string; businessName: string; email: string; phone: string; description: string; budget: string; timeline: string; additional: string };
const EMPTY: Contact = { fullName: "", businessName: "", email: "", phone: "", description: "", budget: "", timeline: "", additional: "" };

function Label({ htmlFor, text, required }: { htmlFor: string; text: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="font-medium text-fg/90">
      {text}
      {required ? <span className="text-accent-bright" aria-hidden> *</span> : null}
    </label>
  );
}

/// Unified enquiry + estimator for every Business Solution. The service's
/// own questions appear as soon as a service is chosen; the estimate panel
/// follows the same rules the server uses.
export function EnquiryForm({ initialService, lockService = false }: { initialService?: string; lockService?: boolean }) {
  const id = useId();
  const [service, setService] = useState(initialService && getSolutionByKey(initialService) ? initialService : "");
  const [answers, setAnswers] = useState<Answers>({});
  const [complexity, setComplexity] = useState<Complexity>("standard");
  const [contact, setContact] = useState<Contact>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failure, setFailure] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const solution = service ? getSolutionByKey(service) : undefined;
  const est = useMemo(() => (solution ? estimate(solution, answers, complexity) : null), [solution, answers, complexity]);

  const setAnswer = (key: string, value: Answers[string]) => setAnswers((a) => ({ ...a, [key]: value }));
  const setField = (key: keyof Contact) => (e: { target: { value: string } }) => setContact((c) => ({ ...c, [key]: e.target.value }));

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!solution) e.service = "Choose a service";
    if (contact.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) e.email = "Enter a valid email address";
    if (!/^[+\d][\d\s()-]{6,}$/.test(contact.phone.trim())) e.phone = "Enter a valid phone or WhatsApp number";
    if (contact.description.trim().length < 10) e.description = "Tell me a little more about the project (at least 10 characters)";
    if (!contact.budget) e.budget = "Choose a budget range";
    if (!contact.timeline) e.timeline = "Choose a timeline";
    for (const f of solution?.fields ?? []) {
      const v = answers[f.key];
      if (f.required) {
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) e[f.key] = f.type === "multi" ? "Choose at least one" : "Please fill this in";
      }
      if (f.type === "number" && v !== undefined && v !== "") {
        const n = Number(v);
        if (!Number.isInteger(n) || n < f.min || n > f.max) e[f.key] = `Enter a whole number from ${f.min} to ${f.max.toLocaleString()}`;
      }
    }
    return e;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${id}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setState("sending");
    setFailure("");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, ...contact, complexity, answers, website: honeypot }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; whatsappUrl?: string; error?: string; issues?: { fieldErrors?: Record<string, string[]> } } | null;
      if (!res.ok || !data?.ok) {
        const fieldErrors = Object.fromEntries(Object.entries(data?.issues?.fieldErrors ?? {}).map(([k, v]) => [k, v[0]]));
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
        setFailure(data?.error === "Validation failed" ? "Some answers need attention. Check the highlighted fields." : data?.error ?? "Your enquiry couldn't be sent. Please try again.");
        setState("failed");
        return;
      }
      setWhatsappUrl(data.whatsappUrl ?? "");
      setState("sent");
    } catch {
      setFailure("Network error: your enquiry wasn't sent. Check your connection and try again.");
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="edge relative flex flex-col items-center gap-4 rounded-[1.5rem] px-6 py-12 text-center">
        <CheckCircle2 className="h-14 w-14 text-accent-bright" aria-hidden />
        <h3 className="text-2xl font-semibold tracking-tight">Enquiry received</h3>
        <p className="max-w-md text-muted">
          Thank you, {contact.fullName.split(" ")[0]}. Your {solution?.name} enquiry is with me and I&apos;ll reply by email or WhatsApp, usually the same day.
        </p>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
            <MessageCircle className="h-4 w-4" aria-hidden /> Also send it on WhatsApp
          </a>
        )}
      </div>
    );
  }

  const err = (key: string) =>
    errors[key] ? (
      <p id={`${id}-${key}-error`} className="text-xs text-red-300">
        {errors[key]}
      </p>
    ) : null;
  const described = (key: string, hint?: string) => [errors[key] && `${id}-${key}-error`, hint && `${id}-${key}-hint`].filter(Boolean).join(" ") || undefined;

  function renderField(f: SolutionField) {
    const fid = `${id}-${f.key}`;
    const value = answers[f.key];
    if (f.type === "multi") {
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset key={f.key} className="flex flex-col gap-2 text-sm sm:col-span-2" aria-describedby={described(f.key, f.hint)}>
          <legend className="mb-1 font-medium text-fg/90">
            {f.label}
            {f.required ? <span className="text-accent-bright" aria-hidden> *</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {f.options.map((o, i) => {
              const on = selected.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={clsx(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-bright",
                    on ? "border-accent/60 bg-accent-soft text-fg" : "border-line-strong text-muted hover:text-fg"
                  )}
                >
                  <input
                    id={i === 0 ? fid : undefined}
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => setAnswer(f.key, on ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          {f.hint && <p id={`${fid}-hint`} className="text-xs text-faint">{f.hint}</p>}
          {err(f.key)}
        </fieldset>
      );
    }
    const common = { id: fid, className: "field", "aria-invalid": errors[f.key] ? true : undefined, "aria-describedby": described(f.key, f.hint) } as const;
    return (
      <div key={f.key} className={clsx("flex flex-col gap-1.5 text-sm", f.type === "textarea" && "sm:col-span-2")}>
        <Label htmlFor={fid} text={f.label} required={f.required} />
        {f.type === "select" ? (
          <select {...common} value={(value as string) ?? ""} onChange={(e) => setAnswer(f.key, e.target.value || undefined)}>
            <option value="">Choose…</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : f.type === "number" ? (
          <input {...common} type="number" inputMode="numeric" min={f.min} max={f.max} placeholder={f.placeholder} value={(value as number | string) ?? ""} onChange={(e) => setAnswer(f.key, e.target.value)} />
        ) : f.type === "textarea" ? (
          <textarea {...common} rows={3} maxLength={f.maxLength} placeholder={f.placeholder} value={(value as string) ?? ""} onChange={(e) => setAnswer(f.key, e.target.value)} />
        ) : (
          <input {...common} maxLength={f.maxLength} placeholder={f.placeholder} value={(value as string) ?? ""} onChange={(e) => setAnswer(f.key, e.target.value)} />
        )}
        {f.hint && <p id={`${fid}-hint`} className="text-xs text-faint">{f.hint}</p>}
        {err(f.key)}
      </div>
    );
  }

  const contactInput = (key: keyof Contact, label: string, props: Record<string, unknown> = {}, required = true) => (
    <div className="flex flex-col gap-1.5 text-sm">
      <Label htmlFor={`${id}-${key}`} text={label} required={required} />
      <input id={`${id}-${key}`} className="field" value={contact[key]} onChange={setField(key)} aria-invalid={errors[key] ? true : undefined} aria-describedby={described(key)} {...props} />
      {err(key)}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" />

        <section aria-labelledby={`${id}-s1`} className="flex flex-col gap-5">
          <h3 id={`${id}-s1`} className="label-mono">1 · Your requirements</h3>
          <div className={clsx("flex flex-col gap-1.5 text-sm", lockService && "hidden")}>
            <Label htmlFor={`${id}-service`} text="Service" required />
            <select
              id={`${id}-service`}
              className="field"
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                setAnswers({});
              }}
              aria-invalid={errors.service ? true : undefined}
            >
              <option value="">Choose a service…</option>
              {SOLUTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
            {err("service")}
          </div>
          {solution ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {solution.fields.filter((f) => !f.key.startsWith("preview")).map(renderField)}
              <div className="flex flex-col gap-1.5 text-sm">
                <Label htmlFor={`${id}-complexity`} text="Customisation level" />
                <select id={`${id}-complexity`} className="field" value={complexity} onChange={(e) => setComplexity(e.target.value as Complexity)}>
                  {Object.entries(COMPLEXITY).map(([k, c]) => (
                    <option key={k} value={k}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Choose a service to see its questions.</p>
          )}
          {solution?.key === "smart-business-cards" && (
            <div className="grid gap-5 sm:grid-cols-2">
              {solution.fields.filter((f) => f.key.startsWith("preview")).map(renderField)}
            </div>
          )}
        </section>

        <section aria-labelledby={`${id}-s2`} className="flex flex-col gap-5">
          <h3 id={`${id}-s2`} className="label-mono">2 · About the project</h3>
          <div className="flex flex-col gap-1.5 text-sm">
            <Label htmlFor={`${id}-description`} text="Project description" required />
            <textarea
              id={`${id}-description`}
              className="field"
              rows={4}
              maxLength={3000}
              value={contact.description}
              onChange={setField("description")}
              placeholder="What does your business do, and what should this solution help with?"
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={described("description")}
            />
            {err("description")}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(["budget", "timeline"] as const).map((key) => (
              <div key={key} className="flex flex-col gap-1.5 text-sm">
                <Label htmlFor={`${id}-${key}`} text={key === "budget" ? "Estimated budget" : "Preferred timeline"} required />
                <select id={`${id}-${key}`} className="field" value={contact[key]} onChange={setField(key)} aria-invalid={errors[key] ? true : undefined} aria-describedby={described(key)}>
                  <option value="">Choose…</option>
                  {(key === "budget" ? BUDGET_OPTIONS : TIMELINE_OPTIONS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {err(key)}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <Label htmlFor={`${id}-additional`} text="Additional requirements (optional)" />
            <textarea id={`${id}-additional`} className="field" rows={2} maxLength={2000} value={contact.additional} onChange={setField("additional")} />
          </div>
        </section>

        <section aria-labelledby={`${id}-s3`} className="flex flex-col gap-5">
          <h3 id={`${id}-s3`} className="label-mono">3 · Your details</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {contactInput("fullName", "Full name", { autoComplete: "name", maxLength: 100 })}
            {contactInput("businessName", "Business or school name (optional)", { autoComplete: "organization", maxLength: 150 }, false)}
            {contactInput("email", "Email address", { type: "email", autoComplete: "email", maxLength: 200 })}
            {contactInput("phone", "Phone or WhatsApp number", { type: "tel", autoComplete: "tel", maxLength: 40, placeholder: "0803 123 4567" })}
          </div>
          <p className="text-xs text-faint">Your details are used only to reply to this enquiry. They&apos;re never shown publicly or shared.</p>
        </section>

        {state === "failed" && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {failure}
          </p>
        )}
        <div>
          <button type="submit" disabled={state === "sending"} className={buttonClass("primary", "lg")}>
            {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {state === "sending" ? "Sending…" : solution?.cta ?? "Send enquiry"}
          </button>
        </div>
      </div>

      <aside aria-label="Estimate" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        {solution?.key === "smart-business-cards" && (
          <CardPreview name={(answers.previewName as string) || contact.fullName} title={answers.previewTitle as string} business={contact.businessName} cardType={answers.cardType as string} />
        )}
        <div className="edge relative rounded-2xl p-5">
          <p className="label-mono">Your estimate</p>
          {est && solution ? (
            <>
              {est.range ? (
                <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
                  {formatNaira(est.range.low)} – {formatNaira(est.range.high)}
                </p>
              ) : (
                <p className="mt-3 text-lg font-semibold">Priced after a short consultation</p>
              )}
              <dl className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted">Scope</dt><dd>{est.scope}</dd></div>
                {est.modules > 0 && <div className="flex justify-between gap-3"><dt className="text-muted">Features / modules</dt><dd>{est.modules}</dd></div>}
                {est.integrations > 0 && <div className="flex justify-between gap-3"><dt className="text-muted">Integrations</dt><dd>{est.integrations}</dd></div>}
                {est.physicalItems > 0 && <div className="flex justify-between gap-3"><dt className="text-muted">Printed items</dt><dd>{est.physicalItems}</dd></div>}
                {est.quantity > 0 && <div className="flex justify-between gap-3"><dt className="text-muted">Quantity</dt><dd>{est.quantity.toLocaleString()}</dd></div>}
                <div className="flex justify-between gap-3"><dt className="text-muted">Customisation</dt><dd>{COMPLEXITY[est.complexity].label.split(" (")[0]}</dd></div>
              </dl>
              <p className="mt-4 text-xs font-medium text-fg/80">Quoted separately where they apply:</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-muted">
                {est.factors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Choose a service and its features to see your scope.</p>
          )}
          <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-faint">{ESTIMATE_DISCLAIMER}</p>
        </div>
      </aside>
    </form>
  );
}
