import { TECH_STACK } from "@/lib/tech-stack-data";

/// Project stacks are typed free-form in the admin ("Js", "Typescript etc",
/// "Postgres"…). This maps them onto one canonical spelling so the same
/// technology is counted once across projects.
const CANONICAL: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  html: "HTML",
  html5: "HTML",
  css: "CSS",
  css3: "CSS",
  react: "React",
  "react.js": "React",
  reactjs: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  next: "Next.js",
  tailwind: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  node: "Node.js",
  "node.js": "Node.js",
  nodejs: "Node.js",
  express: "Express",
  "express.js": "Express",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  supabase: "Supabase",
  paystack: "Paystack",
  "paystack api": "Paystack",
  stripe: "Stripe",
  zustand: "Zustand",
  lucide: "Lucide",
  prisma: "Prisma",
  vercel: "Vercel",
};

export function normalizeTech(raw: string): string {
  const key = raw
    .trim()
    .replace(/\s+etc\.?$/i, "")
    .trim()
    .toLowerCase();
  if (!key) return "";
  return CANONICAL[key] ?? raw.trim().replace(/\s+etc\.?$/i, "");
}

/// What this portfolio itself is built and deployed with, verifiable in
/// package.json / prisma.config.ts.
export const THIS_SITE_STACK = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "PostgreSQL",
  "Supabase",
  "Prisma",
  "Vercel",
];

/// Libraries that are real but not worth a slot in a "stack" showcase.
const HIDDEN = new Set(["Lucide"]);

export function isShowcaseTech(name: string): boolean {
  return Boolean(name) && !HIDDEN.has(name);
}

export type VerifiedTech = { name: string; projects: number; thisSite: boolean };

export function buildVerifiedStack(projectStacks: string[][]): {
  verified: VerifiedTech[];
  toolkit: string[];
} {
  const counts = new Map<string, number>();
  for (const stack of projectStacks) {
    for (const tech of new Set(stack.map(normalizeTech))) {
      if (!tech || HIDDEN.has(tech)) continue;
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
  }
  for (const tech of THIS_SITE_STACK) if (!counts.has(tech)) counts.set(tech, 0);

  const verified = [...counts.entries()]
    .map(([name, projects]) => ({ name, projects, thisSite: THIS_SITE_STACK.includes(name) }))
    .sort((a, b) => b.projects - a.projects || Number(b.thisSite) - Number(a.thisSite) || a.name.localeCompare(b.name));

  const verifiedNames = new Set(verified.map((tech) => tech.name));
  const toolkit = TECH_STACK.map((tech) => normalizeTech(tech.name)).filter(
    (name) => !verifiedNames.has(name)
  );

  return { verified, toolkit };
}
