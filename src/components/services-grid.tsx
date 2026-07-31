"use client";

import {
  ArrowRight,
  Code2,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  Server,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { serviceCategories, type ServiceCategory, type Service } from "@/lib/services-data";
import { useBookingModal } from "@/components/booking-modal";
import { useSpotlight } from "@/lib/use-spotlight";
import { Reveal } from "@/components/reveal";

const ICONS: Record<ServiceCategory["icon"], LucideIcon> = {
  code: Code2,
  server: Server,
  cart: ShoppingCart,
  "layout-dashboard": LayoutDashboard,
  "file-text": FileText,
  gauge: Gauge,
  database: Database,
  shield: ShieldCheck,
};

export function ServicesGrid() {
  return (
    <div className="flex flex-col gap-16">
      {serviceCategories.map((category, categoryIndex) => {
        const Icon = ICONS[category.icon];
        return (
          <Reveal key={category.id} delay={(categoryIndex % 3) * 60}>
            <div className="group mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold sm:text-2xl">{category.title}</h3>
                  <span className="font-serif text-2xl font-bold text-primary/20">
                    {String(categoryIndex + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground/70">{category.description}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.services.map((service) => (
                <ServiceItemCard key={service.id} service={service} />
              ))}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

function ServiceItemCard({ service }: { service: Service }) {
  const { openBooking } = useBookingModal();
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <div>
        <h4 className="font-semibold">{service.title}</h4>
        <p className="mt-1.5 text-sm text-foreground/70">{service.description}</p>
      </div>
      <button
        type="button"
        onClick={() => openBooking(service.title)}
        className="group inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary-dark"
      >
        Book this service
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </button>
    </div>
  );
}
