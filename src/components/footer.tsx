import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle } from "lucide-react";
import { FaSnapchat, FaTiktok } from "react-icons/fa6";
import { Container } from "@/components/ui/container";
import { buildBookingWhatsAppUrl, formatWhatsAppDisplay } from "@/lib/whatsapp";
import type { ServiceCategory } from "@/lib/services-data";

const BASE_EXPLORE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/reviews", label: "Reviews" },
  { href: "/announcements", label: "Announcements" },
  { href: "/contact", label: "Contact" },
];

export function Footer({
  contactEmail,
  whatsappNumber,
  footerBio,
  serviceCategories,
  reviewsVisible,
}: {
  contactEmail: string;
  whatsappNumber: string;
  footerBio: string;
  serviceCategories: ServiceCategory[];
  reviewsVisible: boolean;
}) {
  const EXPLORE_LINKS = reviewsVisible
    ? BASE_EXPLORE_LINKS
    : BASE_EXPLORE_LINKS.filter((link) => link.href !== "/reviews");
  const whatsappUrl = buildBookingWhatsAppUrl(
    {
      name: "there",
      projectType: "a project",
      budget: "TBD",
      details: "I found your portfolio and would like to chat.",
    },
    whatsappNumber
  );

  return (
    <footer className="relative overflow-hidden border-t border-border-subtle bg-surface-muted">
      <div className="grid-texture absolute inset-0 -z-10" />
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.jpg" alt="" width={32} height={32} className="rounded-lg" />
            <p className="font-serif text-lg font-bold">
              Ugochukwu<span className="italic text-primary">.dev</span>
            </p>
          </div>
          <p className="mt-3 max-w-xs text-sm text-foreground/70">{footerBio}</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/25 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/40 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <span className="font-semibold uppercase tracking-wide text-foreground/50">Explore</span>
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-block w-fit text-foreground/70 transition-all duration-200 hover:translate-x-1 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <span className="font-semibold uppercase tracking-wide text-foreground/50">Services</span>
          {serviceCategories.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              href="/services"
              className="inline-block w-fit text-foreground/70 transition-all duration-200 hover:translate-x-1 hover:text-primary"
            >
              {category.title}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <span className="font-semibold uppercase tracking-wide text-foreground/50">Contact</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-foreground/70 hover:text-primary"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            {formatWhatsAppDisplay(whatsappNumber)}
          </a>
          <a
            href={`mailto:${contactEmail}`}
            className="flex items-center gap-2 text-foreground/70 hover:text-primary"
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="break-all">{contactEmail}</span>
          </a>
          <a
            href="https://www.tiktok.com/@ugoskii_51"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-foreground/70 hover:text-primary"
          >
            <FaTiktok className="h-4 w-4 shrink-0" />
            @ugoskii_51
          </a>
          <a
            href="https://www.snapchat.com/add/ugoskii_51"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-foreground/70 hover:text-primary"
          >
            <FaSnapchat className="h-4 w-4 shrink-0" />
            @ugoskii_51
          </a>
        </div>
      </Container>
      <Container className="border-t border-border-subtle py-6 text-center text-xs text-foreground/50">
        © {new Date().getFullYear()} Ugochukwu Chukwu Christian. All rights reserved.
      </Container>
    </footer>
  );
}
