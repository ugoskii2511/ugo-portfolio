import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { prisma } from "@/lib/db";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { PageViewTracker } from "@/components/page-view-tracker";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { getServiceCategories } from "@/lib/get-service-categories";
import { getSettings } from "@/lib/content";

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

export const viewport: Viewport = {
  themeColor: "#050608",
  colorScheme: "dark",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings?.siteName ?? SITE_NAME;
  const siteTagline = settings?.siteTagline ?? SITE_TAGLINE;
  const siteDescription = settings?.siteDescription ?? SITE_DESCRIPTION;
  const title = `${siteName} — ${siteTagline}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s — ${siteName}`,
    },
    description: siteDescription,
    applicationName: "Ugochukwu.dev",
    authors: [{ name: siteName, url: SITE_URL }],
    creator: siteName,
    keywords: [
      "software engineer",
      "web developer",
      "web application development",
      "SaaS development",
      "Next.js developer",
      "React developer",
      "Nigeria",
      "Abuja",
    ],
    openGraph: {
      type: "website",
      locale: "en_US",
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
  "Independent software engineer building websites, web applications and SaaS products, from first idea to production.";

function buildJsonLd(email: string, name: string, tagline: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name,
        jobTitle: tagline,
        description,
        url: SITE_URL,
        email,
        image: `${SITE_URL}/logo.jpg`,
        address: { "@type": "PostalAddress", addressCountry: "NG" },
        knowsAbout: ["Web development", "Web applications", "SaaS", "Next.js", "React", "TypeScript"],
        sameAs: ["https://www.tiktok.com/@ugoskii_51", "https://www.snapchat.com/add/ugoskii_51"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Ugochukwu.dev",
        publisher: { "@id": `${SITE_URL}/#person` },
      },
    ],
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
    getSettings(),
    getServiceCategories(),
  ]);
  const contactEmail = settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL;
  const whatsappNumber = settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER;
  const footerBio = settings?.footerBio ?? DEFAULT_FOOTER_BIO;
  const siteName = settings?.siteName ?? SITE_NAME;
  const siteTagline = settings?.siteTagline ?? SITE_TAGLINE;
  const siteDescription = settings?.siteDescription ?? SITE_DESCRIPTION;
  const reviewsVisible = settings?.reviewsSectionShown ?? true;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="site flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(buildJsonLd(contactEmail, siteName, siteTagline, siteDescription)),
          }}
        />
        <Providers serviceCategories={serviceCategories} forcedTheme="dark">
          <a
            href="#main"
            className="sr-only z-[70] rounded-full bg-accent px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <div aria-hidden className="rails hidden xl:block" />
          <PageViewTracker />
          <AnnouncementBanner announcement={announcement} />
          <Navbar contactEmail={contactEmail} />
          <main id="main" className="relative flex-1">
            {children}
          </main>
          <Footer
            contactEmail={contactEmail}
            whatsappNumber={whatsappNumber}
            footerBio={footerBio}
            reviewsVisible={reviewsVisible}
          />
        </Providers>
      </body>
    </html>
  );
}
