"use client";

import { useState } from "react";
import { Plus, Receipt, Wallet } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { ClientDialog, ExpenseDialog, PaymentDialog, type ClientOption } from "@/components/admin/business/forms";

type Which = "client" | "payment" | "expense" | null;

/// Header buttons for the business pages. Each dialog is mounted fresh on
/// open (key), so it starts empty with a new duplicate-protection id.
export function QuickActions({ options, show = ["client", "payment", "expense"] }: { options: ClientOption[]; show?: Exclude<Which, null>[] }) {
  const [open, setOpen] = useState<Which>(null);
  const [n, setN] = useState(0);
  const openDialog = (which: Exclude<Which, null>) => {
    setN((x) => x + 1);
    setOpen(which);
  };
  const close = () => setOpen(null);
  return (
    <>
      {show.includes("expense") && (
        <button type="button" onClick={() => openDialog("expense")} className={buttonClass("secondary", "sm")}>
          <Receipt className="h-4 w-4" aria-hidden /> Add expense
        </button>
      )}
      {show.includes("payment") && (
        <button type="button" onClick={() => openDialog("payment")} className={buttonClass("secondary", "sm")}>
          <Wallet className="h-4 w-4" aria-hidden /> Record payment
        </button>
      )}
      {show.includes("client") && (
        <button type="button" onClick={() => openDialog("client")} className={buttonClass("primary", "sm")}>
          <Plus className="h-4 w-4" aria-hidden /> Add client
        </button>
      )}
      {open === "client" && <ClientDialog key={`c${n}`} open onClose={close} />}
      {open === "payment" && <PaymentDialog key={`p${n}`} open onClose={close} options={options} />}
      {open === "expense" && <ExpenseDialog key={`e${n}`} open onClose={close} options={options} />}
    </>
  );
}
