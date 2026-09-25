"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  FileText,
  FolderKanban,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatRelative } from "@/components/admin/ui";

export type ShellNotifications = {
  pendingReviews: { id: string; clientName: string; createdAt: string }[];
  pendingReviewCount: number;
  recentLeads: { id: string; clientName: string; projectType: string; createdAt: string }[];
  recentLeadCount: number;
};

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: "leads" | "reviews" };

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Workspace",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/bookings", label: "Leads", icon: Inbox, badge: "leads" },
    ],
  },
  {
    heading: "Portfolio",
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/reviews", label: "Reviews", icon: Star, badge: "reviews" },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/process", label: "Process", icon: ListOrdered },
      { href: "/admin/faqs", label: "FAQ", icon: HelpCircle },
    ],
  },
  {
    heading: "Site",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/content", label: "Site content", icon: FileText },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((group) => group.items);

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Collapsed-sidebar preference lives in localStorage; read through an
// external store so the value is consistent between renders.
const COLLAPSE_KEY = "admin-sidebar-collapsed";
const collapseListeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable (private mode): the toggle still works for this page view.
  }
  collapseListeners.forEach((listener) => listener());
}
function subscribeCollapsed(listener: () => void) {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
}

function Brand({ collapsed, onClick }: { collapsed?: boolean; onClick?: () => void }) {
  return (
    <Link href="/admin" onClick={onClick} className="group flex min-h-11 items-center gap-2.5 rounded-md" aria-label="Admin overview">
      <Image src="/logo.jpg" alt="" width={28} height={28} className="shrink-0 rounded-[7px] ring-1 ring-white/10" />
      {!collapsed && (
        <span className="truncate text-[0.95rem] font-semibold tracking-tight">
          Ugochukwu<span className="text-muted transition-colors group-hover:text-accent-bright">.dev</span>
          <span className="ml-2 rounded-md border border-line-strong px-1.5 py-0.5 align-middle font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
            admin
          </span>
        </span>
      )}
    </Link>
  );
}

function NavList({
  pathname,
  collapsed,
  counts,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  counts: { leads: number; reviews: number };
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-6">
      {NAV.map((group) => (
        <div key={group.heading}>
          {!collapsed ? (
            <p className="label-mono mb-2 px-3 !text-[0.6rem] !text-faint">{group.heading}</p>
          ) : (
            <div aria-hidden className="mx-3 mb-2 h-px bg-line" />
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const count = item.badge ? counts[item.badge] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      "group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                      collapsed && "justify-center",
                      active ? "bg-white/[0.07] text-fg" : "text-muted hover:bg-white/[0.03] hover:text-fg"
                    )}
                  >
                    {active && (
                      <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent-bright" />
                    )}
                    <item.icon
                      aria-hidden
                      className={clsx("h-4 w-4 shrink-0", active ? "text-accent-bright" : "text-faint group-hover:text-muted")}
                    />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {count > 0 && (
                      <span
                        className={clsx(
                          "rounded-full bg-accent font-mono text-[0.62rem] font-medium tabular-nums text-white",
                          collapsed ? "absolute right-1.5 top-1.5 h-2 w-2 overflow-hidden text-transparent" : "px-1.5 py-px"
                        )}
                        aria-label={`${count} ${item.badge === "leads" ? "new this week" : "pending"}`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

async function signOut(router: ReturnType<typeof useRouter>) {
  await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
  router.push("/admin/login");
  router.refresh();
}

/// Small popover used by the top bar menus: closes on outside click and
/// Escape, and hands focus back to its trigger.
function Popover({
  label,
  trigger,
  children,
  align = "right",
}: {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-line px-2 text-muted transition-colors hover:border-line-strong hover:text-fg aria-expanded:border-line-strong aria-expanded:text-fg"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className={clsx(
              "edge absolute top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Notifications({ data }: { data: ShellNotifications }) {
  const total = data.pendingReviewCount + data.recentLeadCount;
  return (
    <Popover
      label={total > 0 ? `Notifications, ${total} items` : "Notifications"}
      trigger={
        <>
          <Bell className="h-4 w-4" aria-hidden />
          {total > 0 && <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-bright ring-2 ring-canvas" />}
        </>
      }
    >
      {(close) => (
        <div>
          <p className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</p>
          {total === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {data.pendingReviews.map((review) => (
                <li key={`r-${review.id}`}>
                  <Link
                    href="/admin/reviews"
                    onClick={close}
                    className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate">
                        Review from <span className="font-medium">{review.clientName}</span> needs approval
                      </span>
                      <span className="text-xs text-faint">{formatRelative(review.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {data.recentLeads.map((lead) => (
                <li key={`l-${lead.id}`}>
                  <Link
                    href={`/admin/bookings?lead=${lead.id}`}
                    onClick={close}
                    className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate">
                        New lead: <span className="font-medium">{lead.clientName}</span>
                      </span>
                      <span className="block truncate text-xs text-faint">
                        {lead.projectType} · {formatRelative(lead.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}

function AccountMenu({ email }: { email: string }) {
  const router = useRouter();
  return (
    <Popover
      label="Account menu"
      trigger={
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-white">
          {email.charAt(0)}
        </span>
      }
    >
      {() => (
        <div className="py-1">
          <div className="border-b border-line px-4 py-3">
            <p className="label-mono !text-[0.6rem]">Signed in as</p>
            <p className="mt-1 truncate text-sm">{email}</p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 items-center gap-3 px-4 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-fg"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden />
            View live site
          </a>
          <button
            type="button"
            onClick={() => signOut(router)}
            className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm text-muted transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </Popover>
  );
}

export function AdminShell({
  email,
  notifications,
  children,
}: {
  email: string;
  notifications: ShellNotifications;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const counts = { leads: notifications.recentLeadCount, reviews: notifications.pendingReviewCount };
  const current = ALL_ITEMS.find((item) => isActive(pathname, item));

  // Close the drawer on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen">
      <a
        href="#admin-main"
        className="sr-only z-[130] rounded-full bg-accent px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-canvas transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex",
          collapsed ? "w-[4.75rem]" : "w-64"
        )}
      >
        <div className={clsx("flex h-16 items-center border-b border-line", collapsed ? "justify-center px-2" : "px-5")}>
          <Brand collapsed={collapsed} />
        </div>
        <div className={clsx("flex-1 overflow-y-auto py-6", collapsed ? "px-3" : "px-3")}>
          <NavList pathname={pathname} collapsed={collapsed} counts={counts} />
        </div>
        <div className="flex flex-col gap-1 border-t border-line p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "View live site" : undefined}
            className={clsx(
              "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-white/[0.03] hover:text-fg",
              collapsed && "justify-center"
            )}
          >
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && "View live site"}
          </a>
          <button
            type="button"
            onClick={() => writeCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={clsx(
              "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-white/[0.03] hover:text-fg",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                aria-controls="admin-drawer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition hover:text-fg lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="lg:hidden">
                <Brand collapsed />
              </div>
              <p className="hidden min-w-0 items-center gap-2 text-sm lg:flex" aria-label="Breadcrumb">
                <span className="label-mono !text-[0.65rem]">Admin</span>
                <span aria-hidden className="text-faint">/</span>
                <span className="truncate text-fg">{current?.label ?? "Overview"}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Notifications data={notifications} />
              <AccountMenu email={email} />
            </div>
          </div>
        </header>

        <main id="admin-main" className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div aria-hidden className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.div
              id="admin-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-full w-[min(18rem,85vw)] flex-col border-r border-line bg-canvas"
            >
              <div className="flex h-16 items-center justify-between border-b border-line px-4">
                <Brand onClick={() => setMobileOpen(false)} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  autoFocus
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-6">
                <NavList pathname={pathname} counts={counts} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="flex flex-col gap-1 border-t border-line p-3">
                <p className="truncate px-3 pb-1 text-xs text-faint">{email}</p>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted hover:text-fg"
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                  View live site
                </a>
                <button
                  type="button"
                  onClick={() => signOut(router)}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm text-muted hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
