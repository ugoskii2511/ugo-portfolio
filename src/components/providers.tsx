"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { BookingModalProvider } from "@/components/booking-modal";
import type { ServiceCategory } from "@/lib/services-data";

export function Providers({
  children,
  serviceCategories,
}: {
  children: ReactNode;
  serviceCategories: ServiceCategory[];
}) {
  return (
    <ThemeProvider>
      <BookingModalProvider serviceCategories={serviceCategories}>
        {children}
      </BookingModalProvider>
    </ThemeProvider>
  );
}
