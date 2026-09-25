import {
  Code2,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  Server,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { ServiceIcon } from "@/lib/services-data";

/// Visual for each allowed ServiceCategory.icon key. Must cover every key in
/// SERVICE_ICON_KEYS (enforced by the Record type).
export const SERVICE_ICONS: Record<ServiceIcon, { icon: LucideIcon; label: string }> = {
  code: { icon: Code2, label: "Code" },
  server: { icon: Server, label: "Server" },
  cart: { icon: ShoppingCart, label: "Commerce" },
  "layout-dashboard": { icon: LayoutDashboard, label: "Dashboard" },
  "file-text": { icon: FileText, label: "Content" },
  gauge: { icon: Gauge, label: "Performance" },
  database: { icon: Database, label: "Database" },
  shield: { icon: ShieldCheck, label: "Security" },
  smartphone: { icon: Smartphone, label: "Mobile" },
};
