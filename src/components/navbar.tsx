"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { useBookingModal } from "@/components/booking-modal";
import { BookButton } from "@/components/site/book-button";
import { Wrap } from "@/components/site/wrap";

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="group flex min-h-11 items-center gap-2.5 rounded-md"
      aria-label="Ugochukwu.dev home"
    >
      <Image
        src="/logo.jpg"
        alt=""
        width={28}
        height={28}
        className="rounded-[7px] ring-1 ring-white/10 transition-transform duration-500 group-hover:rotate-[-8deg]"
      />
      <span className="text-[0.95rem] font-semibold tracking-tight">
        Ugochukwu<span className="text-muted transition-colors group-hover:text-accent-bright">.dev</span>
      </span>
    </Link>
  );
}

export function Navbar({ contactEmail }: { contactEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { openBooking } = useBookingModal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40">
      <div
        className={clsx(
          "border-b transition-[background-color,border-color,backdrop-filter] duration-500",
          scrolled || open
            ? "border-line bg-canvas/75 backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent"
        )}
      >
        <Wrap className="flex h-16 items-center justify-between gap-6">
          <Brand onClick={() => setOpen(false)} />

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1 rounded-full border border-line bg-white/[0.02] p-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "block rounded-full px-4 py-1.5 text-sm transition-colors",
                        active ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <BookButton size="md" className="!min-h-10 !py-2">
                Let&apos;s work together
              </BookButton>
            </span>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line-strong md:hidden"
            >
              <span
                aria-hidden
                className={clsx(
                  "absolute h-px w-4 bg-fg transition-transform duration-300",
                  open ? "rotate-45" : "-translate-y-[3px]"
                )}
              />
              <span
                aria-hidden
                className={clsx(
                  "absolute h-px w-4 bg-fg transition-transform duration-300",
                  open ? "-rotate-45" : "translate-y-[3px]"
                )}
              />
            </button>
          </div>
        </Wrap>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-canvas md:hidden"
      >
        <Wrap className="flex min-h-full flex-col pb-10 pt-8">
          <nav aria-label="Mobile">
            <ul className="border-t border-line">
              {NAV_LINKS.map((link, index) => {
                const active = isActive(pathname, link.href);
                return (
                  <li
                    key={link.href}
                    className="page-enter border-b border-line"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className="flex items-baseline justify-between py-5"
                    >
                      <span className={clsx("display text-4xl", active ? "text-accent-bright" : "text-fg")}>
                        {link.label}
                      </span>
                      <span className="label-mono">0{index + 1}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto flex flex-col gap-4 pt-10">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openBooking("General Inquiry");
              }}
              className="flex min-h-12 items-center justify-center rounded-full bg-accent text-sm font-medium text-white"
            >
              Let&apos;s work together ↗
            </button>
            <a href={`mailto:${contactEmail}`} className="label-mono text-center break-all">
              {contactEmail}
            </a>
          </div>
        </Wrap>
      </div>
    </header>
  );
}
