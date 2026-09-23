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
};

const PROJECT_META: Record<string, ProjectMeta> = {
  "seed-project-2": {
    matchName: "VTU / Airtime & Data Reseller Platform",
    name: "SwiftVTU",
    slug: "swiftvtu",
    category: "Fintech platform",
    lead: "A wallet-based VTU platform for airtime, data and bill payments, with automated delivery.",
    caseStudy: {
      challenge:
        "Reselling airtime and data means handling real money at volume: users fund a wallet, expect purchases to land instantly, and need to trust every transaction.",
      solution:
        "A SaaS-style platform where users fund a wallet through Paystack and purchases are delivered automatically, with no manual processing in the loop.",
      features: [
        "Wallet funding via Paystack",
        "Automated airtime and data delivery across MTN, Airtel, Glo and 9mobile",
        "Electricity and cable TV bill payments",
        "Exam PINs and recharge cards",
        "Data Ajo pooled savings",
        "Pay4Me links so anyone can top up a user's wallet",
        "Event tickets with QR check-in",
        "A path for users to launch their own branded VTU business",
      ],
      outcome: "Live in production at swiftvtu.name.ng.",
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
