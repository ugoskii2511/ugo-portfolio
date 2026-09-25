import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Admin — Ugochukwu.dev",
    template: "%s — Admin",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#050608",
  colorScheme: "dark",
};

export const dynamic = "force-dynamic";

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      {/* Same dark system (and `.site` base styles: focus rings, selection,
          reduced motion) as the public site, so both read as one product. */}
      <body className="site min-h-full">
        <ThemeProvider forcedTheme="dark">{children}</ThemeProvider>
      </body>
    </html>
  );
}
