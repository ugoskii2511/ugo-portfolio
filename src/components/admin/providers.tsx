"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/admin/toast-provider";
import { ConfirmDialogProvider } from "@/components/admin/confirm-dialog";

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
    </ToastProvider>
  );
}
