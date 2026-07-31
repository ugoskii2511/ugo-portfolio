"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileEdit,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", icon: MessageSquare },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/content", label: "Site Content", icon: FileEdit },
];

function NavLinks({ onNavigate, layoutId }: { onNavigate?: () => void; layoutId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={clsx(
              "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-foreground/70 hover:bg-primary-soft hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark shadow-md shadow-primary/25"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-red-500/10 hover:text-red-500"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-surface p-5 lg:flex">
        <Link href="/admin" className="mb-8 text-lg font-bold transition-opacity hover:opacity-80">
          Ugochukwu<span className="text-gradient-royal">.admin</span>
        </Link>
        <NavLinks layoutId="admin-active-pill-desktop" />
        <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle pt-4">
          <p className="truncate px-3.5 text-xs text-foreground/50">{email}</p>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-surface px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle transition hover:border-primary/40 hover:text-primary lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-foreground/70 lg:ml-0">Admin Dashboard</span>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex lg:hidden"
          >
            <motion.div
              className="absolute inset-0 bg-slate-950/60"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="relative z-10 flex w-64 flex-col bg-surface p-5"
            >
              <div className="mb-8 flex items-center justify-between">
                <Link href="/admin" className="text-lg font-bold" onClick={() => setIsMobileOpen(false)}>
                  Ugochukwu<span className="text-gradient-royal">.admin</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavLinks layoutId="admin-active-pill-mobile" onNavigate={() => setIsMobileOpen(false)} />
              <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle pt-4">
                <p className="truncate px-3.5 text-xs text-foreground/50">{email}</p>
                <LogoutButton />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
