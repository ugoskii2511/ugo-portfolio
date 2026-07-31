import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "../globals.css";
import { prisma } from "@/lib/db";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { PageViewTracker } from "@/components/page-view-tracker";
import { PageTransition } from "@/components/page-transition";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// Announcements, projects, and reviews are managed live from the admin
// dashboard, so every page needs to be rendered per-request rather than
// cached as static HTML at build time.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

const DEFAULT_CONTACT_EMAIL = "elitetechsolutions607@gmail.com";
const DEFAULT_WHATSAPP_NUMBER = "2349065606430";

function buildPersonJsonLd(email: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE_NAME,
    jobTitle: SITE_TAGLINE,
    url: SITE_URL,
    email,
  };
}

async function getLatestAnnouncement() {
  const now = new Date();
  const announcement = await prisma.announcement.findFirst({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  return announcement ? { id: announcement.id, message: announcement.message } : null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [announcement, settings] = await Promise.all([
    getLatestAnnouncement(),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const contactEmail = settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL;
  const whatsappNumber = settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildPersonJsonLd(contactEmail)) }}
        />
        <Providers>
          <PageViewTracker />
          <AnnouncementBanner announcement={announcement} />
          <Navbar />
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer contactEmail={contactEmail} whatsappNumber={whatsappNumber} />
        </Providers>
      </body>
    </html>
  );
}
