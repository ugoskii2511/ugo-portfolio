import Link from "next/link";
import { FaSnapchat, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import { Mail } from "lucide-react";
import { Brand } from "@/components/navbar";
import { Wrap } from "@/components/site/wrap";
import { buildBookingWhatsAppUrl, formatWhatsAppDisplay } from "@/lib/whatsapp";

const SITE_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const MORE_LINKS = [
  { href: "/reviews", label: "Client reviews" },
  { href: "/review", label: "Leave a review" },
  { href: "/announcements", label: "Announcements" },
];

export function Footer({
  contactEmail,
  whatsappNumber,
  footerBio,
  reviewsVisible,
}: {
  contactEmail: string;
  whatsappNumber: string;
  footerBio: string;
  reviewsVisible: boolean;
}) {
  const more = reviewsVisible ? MORE_LINKS : MORE_LINKS.filter((link) => link.href !== "/reviews");
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
    <footer className="relative border-t border-line">
      <Wrap className="grid gap-12 py-16 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <Brand />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">{footerBio}</p>
          <div className="mt-6 flex items-center gap-2">
            {[
              { href: whatsappUrl, label: "WhatsApp", icon: FaWhatsapp },
              { href: "https://www.tiktok.com/@ugoskii_51", label: "TikTok", icon: FaTiktok },
              { href: "https://www.snapchat.com/add/ugoskii_51", label: "Snapchat", icon: FaSnapchat },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-4">
          <div>
            <p className="label-mono">Site</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SITE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted transition-colors hover:text-fg">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label-mono">More</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {more.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted transition-colors hover:text-fg">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="md:col-span-3">
          <p className="label-mono">Contact</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-2 break-all text-muted transition-colors hover:text-fg"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {contactEmail}
              </a>
            </li>
            <li>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted transition-colors hover:text-fg"
              >
                <FaWhatsapp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {formatWhatsAppDisplay(whatsappNumber)}
              </a>
            </li>
          </ul>
        </div>
      </Wrap>

      <Wrap className="flex flex-col gap-3 border-t border-line py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Ugochukwu Chukwu Christian</p>
        <p className="font-mono uppercase tracking-[0.14em]">Designed &amp; built by hand · Nigeria</p>
      </Wrap>
    </footer>
  );
}
