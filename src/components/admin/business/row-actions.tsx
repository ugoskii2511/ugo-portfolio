"use client";

import { useState } from "react";
import { buttonClass } from "@/components/site/button";
import { ExpenseDialog, PaymentDialog, type ClientOption, type ExpenseInitial, type PaymentInitial } from "@/components/admin/business/forms";

export function EditPaymentButton({ payment, options }: { payment: PaymentInitial; options: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost", "sm", "!px-2.5")}>
        Edit
      </button>
      {open && <PaymentDialog open onClose={() => setOpen(false)} options={options} payment={payment} />}
    </>
  );
}

export function EditExpenseButton({ expense, options }: { expense: ExpenseInitial; options: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost", "sm", "!px-2.5")}>
        Edit
      </button>
      {open && <ExpenseDialog open onClose={() => setOpen(false)} options={options} expense={expense} />}
    </>
  );
}
