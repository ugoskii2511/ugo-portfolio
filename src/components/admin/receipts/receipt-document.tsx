/* eslint-disable @next/next/no-img-element -- the logo is a user-set URL shown at print size; next/image adds nothing here */
import { clsx } from "clsx";
import { formatMinor, type ReceiptSnapshot } from "@/lib/receipt-calc";

/// The receipt as a sheet of paper: same content and order as the PDF.
/// Always light (it's a printed document), whatever the admin theme. No
/// hooks, so it renders on the server (receipt page) and in the browser
/// (preview before issuing).

const STATUS_CLASS: Record<ReceiptSnapshot["totals"]["status"], string> = {
  PAID: "text-emerald-700",
  OVERPAID: "text-blue-700",
  PARTIAL: "text-amber-700",
  UNPAID: "text-red-700",
};

export function ReceiptDocument({ r, voided, preview }: { r: ReceiptSnapshot; voided?: { reason: string | null; at: string | null } | null; preview?: boolean }) {
  const money = (minor: number) => formatMinor(minor, r.currencySymbol);
  const contact = [r.business.email, r.business.phone, r.business.website].filter(Boolean);
  const showProjectAccount = r.payment.kind === "PROJECT" && r.project;
  return (
    <article
      aria-label={`Payment receipt ${r.number}`}
      className="receipt-paper relative mx-auto w-full max-w-[52rem] overflow-hidden rounded-xl bg-white p-5 text-[13px] leading-relaxed text-slate-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-10"
    >
      {voided && (
        <>
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
            VOIDED{voided.at ? ` on ${voided.at.slice(0, 10)}` : ""}
            {voided.reason ? `: ${voided.reason}` : ""}
          </p>
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] select-none text-[9rem] font-black tracking-widest text-red-600/10 sm:text-[12rem]">
            VOID
          </span>
        </>
      )}
      {preview && (
        <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-800">
          Preview: nothing has been saved yet. The receipt number is assigned when you issue it.
        </p>
      )}

      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {r.business.logoUrl && <img src={r.business.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-contain" />}
          <div className="min-w-0">
            <p className="text-lg font-bold leading-snug">{r.business.name}</p>
            {contact.length > 0 && <p className="break-words text-xs text-slate-500">{contact.join(" · ")}</p>}
            {r.business.address && <p className="whitespace-pre-line text-xs text-slate-500">{r.business.address}</p>}
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xl font-bold tracking-wide text-blue-700">PAYMENT RECEIPT</p>
          <p className="mt-1 text-sm font-semibold">Receipt No. {r.number}</p>
          <p className="text-xs text-slate-500">Issued {r.issueDate}</p>
        </div>
      </header>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Received from</p>
          <p className="mt-1 text-base font-semibold">{r.client.name}</p>
          {[r.client.businessName, r.client.email, r.client.phone].filter(Boolean).map((l) => (
            <p key={l} className="break-words text-xs text-slate-500">
              {l}
            </p>
          ))}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">For project</p>
          {r.project ? (
            <>
              <p className="mt-1 text-base font-semibold">{r.project.title}</p>
              {(r.project.category || r.project.reference) && (
                <p className="text-xs text-slate-500">{[r.project.category, r.project.reference && `Ref: ${r.project.reference}`].filter(Boolean).join(" · ")}</p>
              )}
              {r.project.description && <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs text-slate-500">{r.project.description}</p>}
            </>
          ) : (
            <p className="mt-1 text-base font-semibold">General payment</p>
          )}
        </div>
      </section>

      <section aria-label="This payment" className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">This payment</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">{money(r.payment.amountKobo)}</p>
          <p className="mt-1 font-semibold">{r.payment.description}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 self-center text-xs">
          <dt className="text-slate-500">Issue date</dt>
          <dd className="text-right">{r.issueDate}</dd>
          <dt className="text-slate-500">Method</dt>
          <dd className="text-right">{r.payment.methodLabel}</dd>
          <dt className="text-slate-500">Transaction ref.</dt>
          <dd className="break-all text-right">{r.payment.reference ?? "—"}</dd>
        </dl>
      </section>

      {showProjectAccount && r.project && (
        <section aria-label="Project account" className="pt-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project account</p>
          <dl className="mt-2 divide-y divide-slate-200 text-[13px]">
            {r.project.totalKobo !== null && (r.project.additionalChargesKobo || r.project.discountKobo) ? (
              <>
                <Row label="Project price" value={money(r.project.basePriceKobo ?? 0)} />
                {r.project.additionalChargesKobo ? <Row label="Additional charges" value={`+ ${money(r.project.additionalChargesKobo)}`} /> : null}
                {r.project.discountKobo ? <Row label="Discount" value={`− ${money(r.project.discountKobo)}`} /> : null}
              </>
            ) : null}
            <Row strong label="Total project cost" value={r.project.totalKobo === null ? "Not yet agreed" : money(r.project.totalKobo)} />
            <Row label="Paid before this receipt" value={money(r.totals.paidBeforeKobo)} />
            <Row label="This payment" value={money(r.totals.paidToDateKobo - r.totals.paidBeforeKobo)} />
            <Row strong label="Total paid to date" value={money(r.totals.paidToDateKobo)} valueClass="text-emerald-700" />
            {r.totals.creditKobo > 0 ? (
              <Row strong label="Overpaid (credit)" value={money(r.totals.creditKobo)} valueClass="text-blue-700" />
            ) : (
              <Row strong label="Outstanding balance" value={money(r.totals.outstandingKobo)} valueClass={r.totals.outstandingKobo > 0 ? "text-amber-700" : "text-emerald-700"} />
            )}
          </dl>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <p>
              <span className="text-slate-500">Payment status: </span>
              <strong className={STATUS_CLASS[r.totals.status]}>{r.totals.statusLabel}</strong>
            </p>
            {r.project.totalKobo ? <p className="text-xs text-slate-500">{r.totals.percent}% of the total paid</p> : null}
          </div>
          {r.project.totalKobo ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
              <div className={clsx("h-full rounded-full", r.totals.status === "PARTIAL" ? "bg-amber-500" : r.totals.status === "OVERPAID" ? "bg-blue-600" : "bg-emerald-600")} style={{ width: `${Math.min(r.totals.percent, 100)}%` }} />
            </div>
          ) : null}
        </section>
      )}

      {r.installments.length > 1 && (
        <section aria-label="Payments to date" className="pt-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payments on this project to date</p>
          <ol className="mt-2 text-xs">
            {r.installments.map((p, i) => (
              <li key={p.id} className={clsx("flex justify-between gap-3 rounded px-2 py-1.5", p.isThis ? "bg-slate-100 font-semibold" : "text-slate-600")}>
                <span>
                  {i + 1}. {p.paidOn} {p.description ? `· ${p.description}` : ""}
                  {p.isThis ? " (this receipt)" : ""}
                </span>
                <span className="tabular-nums">{money(p.amountKobo)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="pt-6 text-xs text-slate-600">{r.acknowledgement}</p>

      <footer className="mt-12 flex flex-col-reverse gap-6 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-xs text-slate-500">For {r.business.name}</p>
        <div className="sm:w-60">
          <div className="border-t border-slate-900 pt-1.5">
            <p className="text-[13px] font-semibold">{r.authorizedName ?? r.business.name}</p>
            <p className="text-xs text-slate-500">{r.authorizedTitle ? `${r.authorizedTitle}, authorized representative` : "Authorized representative"}</p>
          </div>
        </div>
      </footer>
      <p className="mt-8 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        {r.footerNote ? `${r.footerNote} · ` : ""}Receipt {r.number} · Amounts in {r.currency}
      </p>
    </article>
  );
}

function Row({ label, value, strong, valueClass }: { label: string; value: string; strong?: boolean; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className={strong ? "font-semibold" : "text-slate-500"}>{label}</dt>
      <dd className={clsx("text-right tabular-nums", strong && "font-semibold", valueClass)}>{value}</dd>
    </div>
  );
}
