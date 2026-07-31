import type { IconType } from "react-icons";
import {
  SiExpress,
  SiFastapi,
  SiFirebase,
  SiGraphql,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiPython,
  SiReact,
  SiStripe,
  SiSupabase,
  SiTailwindcss,
  SiVuedotjs,
  SiWordpress,
} from "react-icons/si";
import { CreditCard, Landmark, Radio, Webhook } from "lucide-react";

export type TechItem = {
  name: string;
  icon: IconType | typeof Webhook;
  color: string;
};

// Brand marks (react-icons/si) render in their real brand color, since
// desaturating them to the site's blue would make several unrecognizable.
// The handful without an official mark (protocols, or brands with no
// Simple Icons entry) fall back to a generic lucide icon in the site's
// primary color instead of guessing at a brand color that doesn't exist.
export const TECH_STACK: TechItem[] = [
  { name: "React", icon: SiReact, color: "#61DAFB" },
  { name: "Next.js", icon: SiNextdotjs, color: "var(--foreground)" },
  { name: "Vue.js", icon: SiVuedotjs, color: "#4FC08D" },
  { name: "Tailwind CSS", icon: SiTailwindcss, color: "#38BDF8" },
  { name: "Node.js", icon: SiNodedotjs, color: "#339933" },
  { name: "Express", icon: SiExpress, color: "var(--foreground)" },
  { name: "Python", icon: SiPython, color: "#3776AB" },
  { name: "FastAPI", icon: SiFastapi, color: "#009688" },
  { name: "GraphQL", icon: SiGraphql, color: "#E10098" },
  { name: "REST APIs", icon: Webhook, color: "var(--color-primary)" },
  { name: "WebSockets", icon: Radio, color: "var(--color-primary)" },
  { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
  { name: "MongoDB", icon: SiMongodb, color: "#47A248" },
  { name: "MySQL", icon: SiMysql, color: "#4479A1" },
  { name: "Firebase", icon: SiFirebase, color: "#FFCA28" },
  { name: "Supabase", icon: SiSupabase, color: "#3ECF8E" },
  { name: "WordPress", icon: SiWordpress, color: "#21759B" },
  { name: "Paystack", icon: CreditCard, color: "var(--color-primary)" },
  { name: "Flutterwave", icon: Landmark, color: "var(--color-primary)" },
  { name: "Stripe", icon: SiStripe, color: "#635BFF" },
];
