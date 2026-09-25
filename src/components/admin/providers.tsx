"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/admin/toast-provider";
import { ConfirmDialogProvider } from "@/components/admin/confirm-dialog";

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    // Framer animations (modals, toasts, drawer) follow the OS reduced-motion setting.
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
