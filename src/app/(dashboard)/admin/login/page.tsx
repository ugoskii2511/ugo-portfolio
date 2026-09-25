import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel: the portfolio's blueprint + glow language */}
      <div className="relative isolate hidden flex-col justify-between overflow-hidden border-r border-line p-12 lg:flex">
        <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
        <div aria-hidden className="accent-glow absolute -bottom-40 -left-40 -z-10 h-[36rem] w-[36rem]" />
        <div className="flex items-center gap-2.5">
          <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded-[7px] ring-1 ring-white/10" />
          <span className="font-semibold tracking-tight">
            Ugochukwu<span className="text-muted">.dev</span>
          </span>
        </div>
        <div>
          <p className="label-mono flex items-center gap-3">
            <span className="live-dot" aria-hidden />
            Control center
          </p>
          <p className="display mt-6 max-w-md text-5xl">
            The private side of <span className="text-accent-bright">Ugochukwu.dev.</span>
          </p>
          <p className="mt-6 max-w-sm text-muted">Projects, leads, reviews and site content, in one place.</p>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-faint">Authorised access only</p>
      </div>

      <div className="flex items-center justify-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded-[7px] ring-1 ring-white/10" />
            <span className="font-semibold tracking-tight">
              Ugochukwu<span className="text-muted">.dev</span>
            </span>
          </div>
          <p className="label-mono">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Use your admin account to manage the site.</p>
          <div className="mt-8">
            <LoginForm redirectTo={from} />
          </div>
          <Link href="/" className="mt-10 inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
            ← Back to the site
          </Link>
        </div>
      </div>
    </div>
  );
}
