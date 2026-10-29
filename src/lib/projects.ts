import { cache } from "react";
import { prisma } from "@/lib/db";
import { isShowcaseTech, normalizeTech } from "@/lib/stack";

/// Editorial layer on top of the admin-managed Project rows.
///
/// The database stays the source of truth for what exists (name, summary,
/// stack, screenshot, live URL, featured/order). This file only adds the
/// presentation details a premium showcase needs and the admin form doesn't
/// have fields for yet: a clean display name, a category, a one-line lead,
/// and optional case-study sections.
///
/// Every entry below is written strictly from facts already in the project
/// row, the product's own live site, or an approved client review — no
/// invented metrics or outcomes. A case-study section only renders when it
/// has content, so it's safe to leave fields out.
///
/// `matchName` guards against drift: overrides apply only while the DB name
/// is still exactly what it was when the entry was written. Rename a project
/// in the admin and the admin's version wins automatically.
export type CaseStudy = {
  challenge?: string;
  solution?: string;
  role?: string;
  features?: string[];
  decisions?: string[];
  outcome?: string;
};

/// A product offered for sale outright (e.g. a finished platform). Prices
/// are whole naira.
export type SaleFeatureGroup = { title: string; intro?: string; items: string[] };

export type Sale = {
  price: number;
  currency: "NGN";
  /// What the buyer receives on payment.
  includes: string[];
  /// What the buyer must supply themselves, shown as a note.
  buyerProvides?: string;
  /// Grouped feature list for the listing.
  groups?: SaleFeatureGroup[];
  /// Closing call to action.
  whatsappUrl?: string;
};

export function formatPrice(sale: Sale) {
  return `₦${sale.price.toLocaleString("en-NG")}`;
}

/// A temporary or conditional listing (e.g. a proposal shown for a limited
/// time). `label` is the short badge; `text` the full explanation.
export type ProjectNotice = { label: string; text: string };

type ProjectMeta = {
  matchName: string;
  name: string;
  slug: string;
  category: string;
  lead: string;
  /// Lowercase fragment matched against approved reviews' `position` to
  /// surface the client's own words on the case study.
  reviewMatch?: string;
  caseStudy?: CaseStudy;
  sale?: Sale;
  notice?: ProjectNotice;
};

const PROJECT_META: Record<string, ProjectMeta> = {
  // Facts from the preview site (tastia-restaurant-brown.vercel.app): its
  // review gate ("website for sale", timed review per visitor), rendered page
  // copy, routes, forms and schema.org data, and its build (Astro on Vercel).
  cmvtdmnm10000jkm57kagvbvi: {
    matchName: "Tastia Restaurant and Bakery",
    name: "Tastia Restaurant and Bakery",
    slug: "tastia-restaurant",
    category: "Restaurant, bakery & café",
    lead: "A proposed redesign for a restaurant, bakery and café group with 13 branches across Abuja, Enugu and Ebonyi, built around its menu and WhatsApp ordering.",
    notice: {
      label: "Limited-time preview",
      text: "This is a proposed redesign for Tastia Restaurant and Bakery, not their official website. The live preview can only be viewed within its timed review window, and it will be removed if Tastia proceeds with development of the site.",
    },
    caseStudy: {
      role: "Designed and built (proposal)",
      challenge:
        "Tastia serves Nigerian, continental and Chinese dishes, pastries and drinks across 13 branches in three states. Customers need to find their nearest branch, see the full menu, and order, book a table or plan an event with that branch directly.",
      solution:
        "A ten-page restaurant site built around the menu and the branches. Customers build an order from the menu and send it to their chosen branch on WhatsApp, with the message already written for them. Table bookings go to the chosen branch too.",
      features: [
        "A full menu of 133 dishes and drinks in 10 categories, from native soups to smoothies",
        "An order builder: pick dishes from the menu and the WhatsApp order message is written for you",
        "13 branches across Abuja, Enugu and Ebonyi, each with click-to-call and a map link",
        "Table reservations sent to the chosen branch",
        "Catering and event enquiries, plus a contact form, each with a hidden spam-trap field",
        "VIP lounge, gallery, blog and our-story pages",
        "Structured data for every branch, so search engines can show addresses and opening hours",
      ],
      outcome: "Shown to Tastia as a proposal at tastia-restaurant-brown.vercel.app.",
    },
  },
  // Facts from the live site (rev-canon-arinze-bookstore.vercel.app):
  // rendered page copy, its routes and forms, the footer link to this
  // portfolio, and its build (Next.js + Tailwind, Vercel Blob media).
  cmvcp8fwu000a06kzir765c1g: {
    matchName: "Nzechukwu's Books",
    name: "Nzechukwu's Books",
    slug: "nzechukwus-books",
    category: "Author bookstore",
    lead: "The official online bookstore for an Abuja priest and author, selling e-books through Selar and physical copies on WhatsApp.",
    caseStudy: {
      challenge:
        "Rev'd Canon Arinze Agbionu's books are sold two ways: e-books through Selar, and physical copies delivered to readers. Readers needed one place to find every title and buy it the right way, without the site ever taking card payments.",
      solution:
        "A bookstore built around the catalogue. Every book has its own page with a full description. Readers can browse by category or search. Each title shows the right way to buy it: a Selar link for e-books, or a WhatsApp order form for physical copies.",
      features: [
        "A catalogue of 10 books, with category filters and search",
        "A full page for each book, showing its description, format and price",
        "E-book purchases handed off to Selar",
        "Physical-copy orders sent to WhatsApp with the book, total, name and delivery address already written out",
        "A cart, plus newsletter sign-up and unsubscribe",
        "A contact form with a hidden spam-trap field",
        "About, FAQ, delivery, privacy and terms pages",
        "A password-protected admin area",
      ],
      outcome: "Live at rev-canon-arinze-bookstore.vercel.app.",
    },
  },
  // Facts from the live site (plotoneltd.com): rendered page copy, its
  // routes and forms, the footer link to this portfolio, and its build
  // (Vite module bundle with React Router, served by Vercel).
  cmv2tt18d000004l3bbdvc4d7: {
    matchName: "Plot One",
    name: "Plot One",
    slug: "plot-one",
    category: "Mortgage & real estate finance",
    lead: "A multi-page website for an Abuja mortgage brokerage, built to turn housing-finance questions into enquiries.",
    caseStudy: {
      challenge:
        "Mortgage brokerage covers a lot of ground: diaspora buyers, first-time buyers, developers and institutions all need different services, and each has questions before they get in touch.",
      solution:
        "A seven-page site that gives every audience its own path: a services page laying out each offering, an FAQ answering common mortgage questions, the team and values behind the firm, and a contact page built to capture enquiries.",
      features: [
        "Seven routed pages: Home, About, Services, Team, Core Values, FAQs and Contact",
        "Service breakdowns for diaspora mortgages, mortgage brokerage, training, financial advisory, fund raising and Hectare Magazine",
        "FAQ accordion covering common mortgage questions",
        "Contact form with a hidden spam-trap field",
        "Animated statistics on the homepage",
        "Click-to-call and a Google Maps link to the Abuja office",
      ],
      outcome: "Live at plotoneltd.com.",
    },
  },
  // Facts from the live app (seed.bianettechltd.com): landing + sign-up
  // copy, its footer credit, and its response headers (Next.js on Vercel,
  // Supabase storage, OpenStreetMap tiles, a separate API service).
  cmuimiubx000004ibc8oyjxxe: {
    matchName: "Seed",
    name: "Seed",
    slug: "seed",
    category: "Agritech marketplace",
    lead: "An agritech marketplace connecting farmers, buyers, traders and the wider agricultural community.",
    caseStudy: {
      role: "Developer",
      challenge:
        "Agriculture runs on many different players (farmers, buyers, traders, suppliers, investors and logistics providers) who rarely meet on one platform, and who don't all read the same language.",
      solution:
        "One marketplace where every account chooses its role, location and language, so each person gets the app in their own language from the moment they sign up.",
      features: [
        "Six account types: Farmer, Buyer, Trader, Supplier, Agro Investor and Logistics Provider",
        "The whole app in nine languages: English, French, Portuguese, Arabic, Kiswahili, Naija Pidgin, Hausa, Yorùbá and Igbo",
        "Language can be changed at any time",
        "Account verification with a one-time code by email or phone",
        "Country and state selection for every account",
        "Map-based features using OpenStreetMap",
      ],
      outcome: "Live at seed.bianettechltd.com, built for Bia'net Tech.",
    },
  },
  "seed-project-2": {
    matchName: "VTU / Airtime & Data Reseller Platform",
    name: "SwiftVTU",
    slug: "swiftvtu",
    category: "Fintech platform",
    lead: "A complete, live VTU platform for Nigeria: automated data, airtime, bills and PINs, Paystack wallets with a dedicated bank account per user, savings and event ticketing, reseller tools and a developer API, on a lightweight PHP + MySQL codebase.",
    sale: {
      price: 350_000,
      currency: "NGN",
      includes: [
        "Full source code and database",
        "The domain and existing setup, ready to keep running",
        "Freedom to change, rebrand or extend anything you like",
      ],
      buyerProvides: "You connect your own VTU API provider, Paystack and SMS accounts.",
      whatsappUrl: "https://wa.me/2349065606430",
      groups: [
        {
          title: "Platform overview",
          intro: "A complete VTU and digital-services business, already live and built for the Nigerian market.",
          items: [
            "Complete, live VTU (Virtual Top-Up) and digital-services platform",
            "Custom PHP 8.2 + MySQL codebase with no framework: lightweight, and easy to host on any cPanel or DirectAdmin server",
            "Responsive Tailwind CSS interface with dark mode",
            "Installable as a mobile app (PWA) with push notifications",
            "Live at swiftvtu.name.ng with HTTPS enabled",
          ],
        },
        {
          title: "Core VTU services",
          intro: "Every service is automated through an API, with no manual processing.",
          items: [
            "Data bundles for MTN, Airtel, Glo and 9mobile",
            "Airtime top-up on all networks",
            "Cable TV subscriptions with smartcard verification",
            "Electricity bill payments with meter verification",
            "Exam and education PINs",
            "Recharge card printing",
            "Betting wallet funding",
            "Bulk SMS",
            "Airtime-to-cash conversion",
          ],
        },
        {
          title: "Wallet & payments",
          intro: "Several ways for customers to fund, move and spend money, with Paystack doing the heavy lifting.",
          items: [
            "Wallet funding through Paystack card payments, credited automatically by webhook",
            "A dedicated virtual bank account for every user: fund by bank transfer, credited automatically",
            "Wallet-to-wallet transfers between users",
            "Withdrawals to bank accounts through Paystack Transfers",
            "Wallet PIN for large transactions",
            "“Pay4Me”: let someone else pay for a purchase",
            "Coupons and cashback rewards",
            "Daily check-in rewards",
            "Downloadable transaction receipts",
          ],
        },
        {
          title: "Savings & extra products",
          intro: "Products beyond top-ups, giving customers more reasons to come back.",
          items: [
            "Savings vault",
            "Ajo (group/rotating savings)",
            "Event ticketing: event listings, ticket sales held in escrow, and automatic organiser payouts to their bank",
            "Social media boosting (SMM panel): followers, likes, views and more",
          ],
        },
        {
          title: "Business & reseller tools",
          intro: "Built to grow through resellers and partners, not only direct customers.",
          items: [
            "Tiered pricing: Smart Earner, Reseller and API Partner, with in-app tier upgrades",
            "Reseller panel and personal reseller storefronts (“My Store”)",
            "White-label option",
            "Developer API portal, so partners can plug the services into their own apps",
          ],
        },
        {
          title: "Security & accounts",
          intro: "The safeguards a platform that handles money needs.",
          items: [
            "Registration with email verification, password reset and login-attempt limiting",
            "Biometric / passkey login (WebAuthn)",
            "User ban and appeal system",
            "Terms-of-service acceptance gate",
          ],
        },
        {
          title: "Support",
          intro: "Customers can get help without leaving the platform.",
          items: ["Support ticket system", "AI-powered customer support assistant", "Contact page and WhatsApp support link"],
        },
        {
          title: "Admin panel",
          intro: "Run the whole business from one dashboard.",
          items: [
            "Full admin dashboard: users, transactions, wallet lookups, SMM orders, appeals and statistics",
            "Data plan pricing and profit management",
            "Email broadcasts to users",
            "Coupon management and user tier control",
          ],
        },
        {
          title: "SEO & marketing",
          intro: "Set up to be found and shared.",
          items: [
            "SEO meta tags and Open Graph social previews",
            "Auto-generated sitemap and robots.txt",
            "Professional landing page",
          ],
        },
      ],
    },
  },
  "seed-project-3": {
    matchName: "E-Commerce Storefront",
    name: "PickByKay",
    slug: "pickbykay",
    category: "E-commerce",
    lead: "P.I.C.K, a curated accessories and beauty storefront with inventory, cart and checkout.",
    caseStudy: {
      solution:
        "A modern storefront backed by inventory management, with a complete cart and checkout flow for curated accessories and beauty essentials.",
      features: [
        "Product catalogue backed by inventory management",
        "Wishlist and shopping bag",
        "Cart and checkout flow",
        "Online payments",
      ],
      outcome: "Live in production at pickbykay.com.ng.",
    },
  },
  cmsa2z61z00003lfcdawvae1r: {
    matchName: "PRUDENTIAL INTERNATIONAL SCHOOL",
    name: "Prudential International School",
    slug: "prudential-international-school",
    category: "Education",
    lead: "The official website for a school in Gwarinpa, Abuja, built around admissions.",
    reviewMatch: "prudential",
    caseStudy: {
      challenge:
        "An established school in Gwarinpa, Abuja needed an online presence that reflected its standards and gave parents a clear route to admission.",
      solution:
        "A polished school website that leads with the school's identity and values, and puts “Apply for Admission” front and centre.",
      features: [
        "Admissions-first homepage with a clear call to action",
        "School story, values and history",
        "Responsive layout built for parents browsing on their phones",
      ],
      outcome: "Live at prudentialschool.com.ng.",
    },
  },
  cmsntycqj000i04k04hsnn089: {
    matchName: "DESIGN AGENCY PORTFOLIO WEBSITE",
    name: "Elite Flyers",
    slug: "elite-flyers",
    category: "Brand & design studio",
    lead: "The website for my own Abuja design agency: print, branding, digital and clothing.",
    caseStudy: {
      role: "Owner. Designed and built.",
      challenge:
        "A design agency's website is its portfolio. It has to prove taste before a client reads a word.",
      solution:
        "A dark, editorial site that showcases services, creative work and brand identity, and gives clients a professional way to get in touch.",
      features: ["Service showcase: print, branding, digital and clothing", "Creative work gallery", "Direct client contact"],
      outcome: "Live at eliteflyers.shop.",
    },
  },
  cmsntf6rd000304k0t2qgjzkm: {
    matchName: "MEDIA AGENCY WEBSITE",
    name: "The Media Reborn",
    slug: "the-media-reborn",
    category: "Creative media company",
    lead: "A modern, professional website for a creative media company.",
    reviewMatch: "media reborn",
    caseStudy: {
      role: "Designed and built",
      solution:
        "A clean, responsive website focused on the agency's services, brand and online presence.",
      outcome: "Live at themediareborn.com.",
    },
  },
  cmsntlq8w000704k0fvo93e37: {
    matchName: "E-COMMERCE STORE 2",
    name: "Chimdy’s Collection",
    slug: "chimdys-collection",
    category: "E-commerce",
    lead: "A clean, elegant online presence for a jewellery brand.",
    caseStudy: {
      role: "Designed and built",
      outcome: "Live at chimdyscollection.name.ng.",
    },
  },
  cmtfq2d5j000004l6wmxmgjdq: {
    matchName: "PUKKA BEAUT WEBSITE",
    name: "Pukka Beaut",
    slug: "pukka-beaut",
    category: "Bakery & events",
    lead: "An elegant website for a brand that combines baking with event planning.",
    caseStudy: { outcome: "Live at pukkabeaut.com." },
  },
  cmu64d2va000104guhj2h4ndl: {
    matchName: "LOGISTICS WEBSITE🚛🚚",
    name: "Cometra Logistics",
    slug: "cometra-logistics",
    category: "Logistics",
    lead: "A website for a logistics company connecting businesses and customers with delivery services.",
  },
  cmu64j7ok000204gugrdvg1at: {
    matchName: "NAIJA BITES RESTAURANT WEBSITE",
    name: "Naija Bites",
    slug: "naija-bites",
    category: "Restaurant",
    lead: "A restaurant website that showcases the menu and makes browsing it easy.",
  },
  cmu64lfdh000304guytqh1fp9: {
    matchName: "AURRELLE REAL ESTATE PROPERTIES WEBSITE",
    name: "Aurelle Properties",
    slug: "aurelle-properties",
    category: "Real estate",
    lead: "A real estate website for exploring property listings and their key features.",
  },
  cmu64qzh3000404gu7wn60fgu: {
    matchName: "BLACKGOLD BARBER",
    name: "BlackGold Barber Co.",
    slug: "blackgold-barber",
    category: "Grooming",
    lead: "A stylish website for a grooming business, with services and appointment booking.",
  },
};

export type ShowcaseProject = {
  id: string;
  slug: string;
  name: string;
  category: string;
  lead: string;
  summary: string;
  stack: string[];
  imageUrl: string | null;
  liveUrl: string | null;
  domain: string | null;
  featured: boolean;
  reviewMatch?: string;
  caseStudy: CaseStudy;
  sale?: Sale;
  notice?: ProjectNotice;
};

type ProjectRow = {
  id: string;
  name: string;
  summary: string;
  liveUrl: string | null;
  techStack: string[];
  imageUrl: string | null;
  featured: boolean;
};

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

export function stripEmoji(text: string): string {
  return text.replace(EMOJI, "").replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").trim();
}

function tidyName(name: string): string {
  const clean = stripEmoji(name);
  if (clean !== clean.toUpperCase()) return clean;
  return clean
    .toLowerCase()
    .replace(/(^|[\s/-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/// First sentence of the summary, minus any short title-ish first line
/// (several summaries open with e.g. "Design Agency Website 🎨💻").
function leadFrom(summary: string): string {
  const paragraphs = stripEmoji(summary).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const body = paragraphs.find((p) => p.length > 60) ?? paragraphs[0] ?? "";
  const sentence = body.match(/^.*?[.!?](\s|$)/)?.[0] ?? body;
  return sentence.trim();
}

export function toShowcase(project: ProjectRow): Omit<ShowcaseProject, "slug"> & { slug: string } {
  const meta = PROJECT_META[project.id];
  const useMeta = meta && meta.matchName === project.name;
  const name = useMeta ? meta.name : tidyName(project.name);

  return {
    id: project.id,
    slug: useMeta ? meta.slug : slugify(name) || project.id,
    name,
    category: useMeta ? meta.category : "Web project",
    lead: useMeta ? meta.lead : leadFrom(project.summary),
    summary: stripEmoji(project.summary),
    stack: [...new Set(project.techStack.map(normalizeTech).filter(isShowcaseTech))],
    imageUrl: project.imageUrl,
    liveUrl: project.liveUrl,
    domain: domainOf(project.liveUrl),
    featured: project.featured,
    reviewMatch: useMeta ? meta.reviewMatch : undefined,
    caseStudy: (useMeta && meta.caseStudy) || {},
    sale: useMeta ? meta.sale : undefined,
    notice: useMeta ? meta.notice : undefined,
  };
}

/// De-duplicates slugs so two similarly named projects never collide.
function withUniqueSlugs(projects: ShowcaseProject[]): ShowcaseProject[] {
  const seen = new Set<string>();
  return projects.map((project) => {
    let slug = project.slug;
    if (seen.has(slug)) slug = `${slug}-${project.id.slice(-6)}`;
    seen.add(slug);
    return { ...project, slug };
  });
}

/// Every project, in the same order the admin controls: featured first,
/// then manual order, then newest.
/// Memoized per request (a case study reads it for metadata and the page).
export const getShowcaseProjects = cache(async (): Promise<ShowcaseProject[]> => {
  const rows = await prisma.project.findMany({
    orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
  });
  return withUniqueSlugs(rows.map(toShowcase));
});
