"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { Field } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";
import { PAYMENT_RECORD_STATUSES, PAYMENT_RECORD_STATUS_LABEL, type PaymentRecordStatus } from "@/lib/receipt-calc";

const HELP: Record<PaymentRecordStatus, string> = {
  CONFIRMED: "The money arrived. It counts toward totals and can have a receipt.",
  FAILED: "The payment never went through.",
  CANCELLED: "The payment was called off before it completed.",
  REVERSED: "The bank or provider pulled the money back.",
  REFUNDED: "You gave the money back to the client.",
};

/// Change a payment's status. Anything but Confirmed takes it out of every
/// total and voids its receipt; the record and the receipt stay on file.
export function PaymentStatusButton({ id, status, label }: { id: string; status: PaymentRecordStatus; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<PaymentRecordStatus>(status === "CONFIRMED" ? "REVERSED" : "CONFIRMED");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest<{ receiptVoided?: boolean }>(`/api/admin/business/payments/${id}`, { method: "PATCH", body: { status: next, reason: reason || null } });
      toast.success(`Payment marked ${PAYMENT_RECORD_STATUS_LABEL[next].toLowerCase()}.${result.receiptVoided ? " Its receipt was voided." : ""}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setReason(""); setError(""); setOpen(true); }} className={buttonClass("ghost", "sm", "!px-2.5")} aria-label={`Change status of ${label}`}>
        Status
      </button>
      {open && (
        <AdminModal
          isOpen
          onClose={() => setOpen(false)}
          title="Change payment status"
          description={`${label}. Currently: ${PAYMENT_RECORD_STATUS_LABEL[status]}.`}
          footer={<ModalFormFooter formId={formId} onCancel={() => setOpen(false)} submitLabel="Save status" isSubmitting={busy} error={error} />}
        >
          <form
            id={formId}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (next !== "CONFIRMED" && !reason.trim()) return setError("Say briefly why.");
              void save();
            }}
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-[0.8rem] font-medium">New status</legend>
              {PAYMENT_RECORD_STATUSES.filter((s) => s !== status).map((s) => (
                <label key={s} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-accent/60 has-[:checked]:bg-accent-soft">
                  <input type="radio" name="status" value={s} checked={next === s} onChange={() => setNext(s)} className="mt-1 h-4 w-4" />
                  <span>
                    <span className="font-medium">{PAYMENT_RECORD_STATUS_LABEL[s]}</span>
                    <span className="block text-xs text-muted">{HELP[s]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Field label={next === "CONFIRMED" ? "Note (optional)" : "Reason"} htmlFor={`${formId}-reason`}>
              <input id={`${formId}-reason`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="field" placeholder="e.g. Transfer reversed by the bank on 21 Oct" />
            </Field>
            {status === "CONFIRMED" && <p className="text-xs text-amber-300">The payment will stop counting toward totals, and its receipt (if any) will be voided. Both stay on record.</p>}
            {next === "CONFIRMED" && <p className="text-xs text-muted">It will count again. Issue a fresh receipt for it afterwards if you need one.</p>}
          </form>
        </AdminModal>
      )}
    </>
  );
}
