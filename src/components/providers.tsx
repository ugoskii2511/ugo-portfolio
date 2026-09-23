"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { BookingModalProvider } from "@/components/booking-modal";
import type { ServiceCategory } from "@/lib/services-data";

export function Providers({
  children,
  serviceCategories,
  forcedTheme,
}: {
  children: ReactNode;
  serviceCategories: ServiceCategory[];
  forcedTheme?: string;
}) {
  return (
    <ThemeProvider forcedTheme={forcedTheme}>
      <BookingModalProvider serviceCategories={serviceCategories}>{children}</BookingModalProvider>
    </ThemeProvider>
  );
}
