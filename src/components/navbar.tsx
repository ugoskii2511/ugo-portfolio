"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBookingModal } from "@/components/booking-modal";
import { Container } from "@/components/ui/container";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/reviews", label: "Reviews" },
  { href: "/announcements", label: "Announcements" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openBooking } = useBookingModal();

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-lg">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-serif text-lg font-bold tracking-tight transition-opacity hover:opacity-80"
          onClick={() => setIsMenuOpen(false)}
        >
          Ugochukwu<span className="italic text-primary">.dev</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-primary-dark" : "text-foreground/70 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary-soft"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => openBooking("General Inquiry")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="hidden rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/25 transition-shadow hover:shadow-lg hover:shadow-primary/40 sm:inline-flex"
          >
            Let&apos;s Talk
          </motion.button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMenuOpen ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border-subtle bg-background lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-3">
              {NAV_LINKS.map((link, index) => {
                const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={clsx(
                        "block rounded-lg px-3.5 py-2.5 text-sm font-medium transition",
                        isActive ? "bg-primary-soft text-primary-dark" : "text-foreground/70"
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openBooking("General Inquiry");
                }}
                className="mt-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Let&apos;s Talk
              </button>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
