"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children, forcedTheme }: { children: ReactNode; forcedTheme?: string }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  );
}
