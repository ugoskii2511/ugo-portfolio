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
import { getServiceCategories } from "@/lib/get-service-categories";

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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const siteName = settings?.siteName ?? SITE_NAME;
  const siteTagline = settings?.siteTagline ?? SITE_TAGLINE;
  const siteDescription = settings?.siteDescription ?? SITE_DESCRIPTION;
  const title = `${siteName} | ${siteTagline}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName,
      title,
      description: siteDescription,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: siteDescription,
    },
  };
}

const DEFAULT_CONTACT_EMAIL = "elitetechsolutions607@gmail.com";
const DEFAULT_WHATSAPP_NUMBER = "2349065606430";
const DEFAULT_FOOTER_BIO =
  "Ugochukwu Chukwu Christian — full-stack web developer building fast, modern websites, dashboards, and platforms.";

function buildPersonJsonLd(email: string, name: string, tagline: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: tagline,
    url: SITE_URL,
    email,
    image: `${SITE_URL}/logo.jpg`,
    sameAs: ["https://www.tiktok.com/@ugoskii_51", "https://www.snapchat.com/add/ugoskii_51"],
  };
}

/// name/tagline/email here come from admin-editable site settings. Escaping
/// "<" stops a "</script>" sequence in any of those fields from closing this
/// tag early and letting the rest of its content run as live HTML/script.
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
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
  const [announcement, settings, serviceCategories] = await Promise.all([
    getLatestAnnouncement(),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    getServiceCategories(),
  ]);
  const contactEmail = settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL;
  const whatsappNumber = settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER;
  const footerBio = settings?.footerBio ?? DEFAULT_FOOTER_BIO;
  const siteName = settings?.siteName ?? SITE_NAME;
  const siteTagline = settings?.siteTagline ?? SITE_TAGLINE;
  const reviewsVisible = settings?.reviewsSectionShown ?? true;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(buildPersonJsonLd(contactEmail, siteName, siteTagline)),
          }}
        />
        <Providers serviceCategories={serviceCategories}>
          <PageViewTracker />
          <AnnouncementBanner announcement={announcement} />
          <Navbar reviewsVisible={reviewsVisible} />
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer
            contactEmail={contactEmail}
            whatsappNumber={whatsappNumber}
            footerBio={footerBio}
            serviceCategories={serviceCategories}
            reviewsVisible={reviewsVisible}
          />
        </Providers>
      </body>
    </html>
  );
}
