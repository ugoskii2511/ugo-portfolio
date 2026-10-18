"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/site/button";

/// The browser's print dialog can "Save as PDF", which gives a downloadable
/// report without adding a PDF library.
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary", "sm")} data-print-hide>
      <Printer className="h-4 w-4" aria-hidden /> Print / save PDF
    </button>
  );
}
