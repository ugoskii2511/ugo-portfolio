import Link from "next/link";
import { buttonClass } from "@/components/site/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="edge relative w-full max-w-md rounded-[1.4rem] p-8">
        <p className="label-mono">Error 404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">No admin page here</h1>
        <p className="mt-2 text-sm text-muted">It may have moved, or the link is mistyped.</p>
        <Link href="/admin" className={buttonClass("primary", "sm", "mt-6")}>
          Back to overview
        </Link>
      </div>
    </div>
  );
}
