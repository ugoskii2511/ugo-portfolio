"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Download, Printer, RefreshCw } from "lucide-react";
import { AdminModal, ModalFormFooter } from "@/components/admin/modal";
import { Field } from "@/components/admin/ui";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary", "sm")}>
      <Printer className="h-4 w-4" aria-hidden /> Print
    </button>
  );
}

export function DownloadPdfButton({ id }: { id: string }) {
  return (
    <a href={`/api/admin/receipts/${id}/pdf?download=1`} className={buttonClass("secondary", "sm")} download>
      <Download className="h-4 w-4" aria-hidden /> Download PDF
    </a>
  );
}

/// Void (with a required reason) or reissue a receipt. Both are logged.
export function ReceiptStatusActions({ id, number, voided, paymentUsable }: { id: string; number: string; voided: boolean; paymentUsable: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const formId = useId();
  const [mode, setMode] = useState<"void" | "reissue" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (mode === "void") {
        await adminRequest(`/api/admin/receipts/${id}`, { method: "PATCH", body: { action: "void", reason } });
        toast.success(`Receipt ${number} voided. It stays on record.`);
        setMode(null);
        router.refresh();
      } else {
        const result = await adminRequest<{ id: string; number: string }>(`/api/admin/receipts/${id}`, { method: "PATCH", body: { action: "reissue", reason: reason || undefined } });
        toast.success(`Issued ${result.number}${voided ? "" : ` (replaces ${number})`}.`);
        setMode(null);
        router.push(`/admin/receipts/${result.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {paymentUsable && (
        <button type="button" onClick={() => { setReason(""); setMode("reissue"); }} className={buttonClass("secondary", "sm")}>
          <RefreshCw className="h-4 w-4" aria-hidden /> {voided ? "Issue new receipt" : "Reissue"}
        </button>
      )}
      {!voided && (
        <button type="button" onClick={() => { setReason(""); setMode("void"); }} className={buttonClass("danger", "sm")}>
          <Ban className="h-4 w-4" aria-hidden /> Void
        </button>
      )}
      {mode && (
        <AdminModal
          isOpen
          onClose={() => setMode(null)}
          title={mode === "void" ? `Void receipt ${number}?` : voided ? "Issue a new receipt?" : `Reissue ${number}?`}
          description={
            mode === "void"
              ? "The receipt is kept and marked VOID with your reason. The payment itself is not changed: to reverse or refund money, change the payment's status in Payment history."
              : `A new receipt with a new number is issued from the payment's current details${voided ? "" : `, and ${number} is voided`}.`
          }
          footer={<ModalFormFooter formId={formId} onCancel={() => setMode(null)} submitLabel={mode === "void" ? "Void receipt" : "Issue receipt"} isSubmitting={busy} error={error} />}
        >
          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "void" && reason.trim().length < 3) return setError("Give a short reason.");
              void submit();
            }}
          >
            <Field label={mode === "void" ? "Reason" : "Reason (optional)"} htmlFor={`${formId}-reason`}>
              <input id={`${formId}-reason`} autoFocus maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="field" placeholder={mode === "void" ? "e.g. Wrong amount entered" : "e.g. Client's name corrected"} />
            </Field>
          </form>
        </AdminModal>
      )}
    </>
  );
}
