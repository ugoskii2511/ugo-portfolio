"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { BookingModalProvider } from "@/components/booking-modal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BookingModalProvider>{children}</BookingModalProvider>
    </ThemeProvider>
  );
}
