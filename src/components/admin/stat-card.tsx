import Link from "next/link";
import { clsx } from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

/// Overview metric. `trend` compares two real periods; when there's no
/// previous data it says so rather than inventing a percentage.
export function StatCard({
  label,
  value,
  icon,
  detail,
  trend,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  detail?: ReactNode;
  trend?: { current: number; previous: number; period: string };
  href?: string;
  tone?: "default" | "attention";
}) {
  let trendNode: ReactNode = null;
  if (trend) {
    if (trend.previous === 0) {
      trendNode = <span className="text-faint">{trend.current > 0 ? "No prior data" : "—"}</span>;
    } else {
      const change = ((trend.current - trend.previous) / trend.previous) * 100;
      const up = change >= 0;
      trendNode = (
        <span className={clsx("inline-flex items-center gap-0.5 font-medium", up ? "text-emerald-300" : "text-red-300")}>
          {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
          {Math.abs(change).toFixed(0)}%
          <span className="font-normal text-faint">&nbsp;vs prev {trend.period}</span>
        </span>
      );
    }
  }

  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="label-mono !text-[0.62rem]">{label}</p>
        <span
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-lg border",
            tone === "attention" ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : "border-line bg-white/[0.03] text-muted"
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:mt-4 sm:text-3xl">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {(detail || trendNode) && <p className="mt-1.5 text-xs text-muted">{trendNode ?? detail}</p>}
    </>
  );

  const className =
    "spot relative block min-w-0 rounded-2xl border border-line bg-raised p-4 transition-colors duration-300 sm:p-5";
  return href ? (
    <Link href={href} className={clsx(className, "hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
