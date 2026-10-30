import { Bot, Boxes, CreditCard, GraduationCap, ShoppingBag, Workflow, type LucideIcon } from "lucide-react";
import type { SolutionIcon as IconKey } from "@/lib/solutions";

const ICONS: Record<IconKey, LucideIcon> = {
  box: Boxes,
  workflow: Workflow,
  card: CreditCard,
  sparkles: Bot,
  school: GraduationCap,
  store: ShoppingBag,
};

export function SolutionIcon({ icon, className }: { icon: IconKey; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden className={className} />;
}
