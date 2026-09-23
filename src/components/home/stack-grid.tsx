import type { IconType } from "react-icons";
import {
  SiCss,
  SiExpress,
  SiHtml5,
  SiJavascript,
  SiMongodb,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiPrisma,
  SiReact,
  SiStripe,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
} from "react-icons/si";
import { CreditCard, Layers } from "lucide-react";
import { Reveal } from "@/components/reveal";
import type { VerifiedTech } from "@/lib/stack";

const ICONS: Record<string, IconType | typeof Layers> = {
  React: SiReact,
  "Next.js": SiNextdotjs,
  TypeScript: SiTypescript,
  JavaScript: SiJavascript,
  HTML: SiHtml5,
  CSS: SiCss,
  "Tailwind CSS": SiTailwindcss,
  "Node.js": SiNodedotjs,
  Express: SiExpress,
  MongoDB: SiMongodb,
  PostgreSQL: SiPostgresql,
  Supabase: SiSupabase,
  Prisma: SiPrisma,
  Vercel: SiVercel,
  Stripe: SiStripe,
  Paystack: CreditCard,
};

function evidence(tech: VerifiedTech): string {
  const parts: string[] = [];
  if (tech.projects > 0) parts.push(`${tech.projects} project${tech.projects === 1 ? "" : "s"}`);
  if (tech.thisSite) parts.push("this site");
  return parts.join(" + ");
}

/// Technologies with evidence: counted from the stacks of real projects in
/// the database, plus what this site itself is built with.
export function StackGrid({ verified, toolkit }: { verified: VerifiedTech[]; toolkit: string[] }) {
  return (
    <div>
      <ul className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-4">
        {verified.map((tech, index) => {
          const Icon = ICONS[tech.name] ?? Layers;
          return (
            <Reveal
              as="li"
              key={tech.name}
              delay={(index % 4) * 50}
              className="group flex min-h-32 flex-col justify-between gap-6 border-b border-r border-line p-4 transition-colors duration-500 hover:bg-white/[0.025] sm:p-5"
            >
              <Icon
                aria-hidden
                className="h-5 w-5 text-faint transition-colors duration-500 group-hover:text-fg"
              />
              <div>
                <p className="font-medium tracking-tight">{tech.name}</p>
                <p className="mt-1 font-mono text-[0.68rem] text-faint">{evidence(tech)}</p>
              </div>
            </Reveal>
          );
        })}
      </ul>
      {toolkit.length > 0 && (
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted">
          <span className="label-mono mr-3">Also in the toolkit</span>
          {toolkit.join(" · ")}
        </p>
      )}
    </div>
  );
}
