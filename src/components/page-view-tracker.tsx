"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/track";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent("PAGE_VIEW", pathname);
  }, [pathname]);

  return null;
}
