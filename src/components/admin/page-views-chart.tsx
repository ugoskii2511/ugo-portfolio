"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { DailyPageViews } from "@/lib/analytics";
import { Segmented } from "@/components/admin/ui";

const CHART_HEIGHT = 176;
const RANGES = ["7", "14", "30"] as const;
type Range = (typeof RANGES)[number];

function niceCeiling(value: number): number {
  if (value <= 5) return Math.max(value, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

/// Daily page views as bars. Receives the last 30 days and slices client
/// side for the 7/14/30 toggle. Each bar is focusable, so exact values are
/// reachable by keyboard as well as hover.
export function PageViewsChart({ data }: { data: DailyPageViews[] }) {
  const [range, setRange] = useState<Range>("14");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const series = data.slice(-Number(range));
  const total = series.reduce((sum, day) => sum + day.count, 0);
  const niceMax = niceCeiling(Math.max(0, ...series.map((d) => d.count)));
  const hovered = hoverIndex !== null ? series[hoverIndex] : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Page views</h2>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums tracking-tight">
              {(hovered ? hovered.count : total).toLocaleString()}
            </span>
            <span className="text-xs text-muted">
              {hovered ? hovered.label : `last ${range} days · ${(total / series.length).toFixed(1)}/day`}
            </span>
          </p>
        </div>
        <Segmented
          label="Chart range"
          value={range}
          onChange={(value) => {
            setRange(value);
            setHoverIndex(null);
          }}
          options={RANGES.map((value) => ({ value, label: `${value}d` }))}
        />
      </div>

      <div className="px-5 pb-5 pt-6">
        <div className="flex gap-3">
          <div
            className="flex shrink-0 flex-col justify-between text-right font-mono text-[10px] tabular-nums text-faint"
            style={{ height: CHART_HEIGHT }}
            aria-hidden
          >
            <span>{niceMax.toLocaleString()}</span>
            <span>{Math.round(niceMax / 2).toLocaleString()}</span>
            <span>0</span>
          </div>

          <div className="relative min-w-0 flex-1">
            <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <div className="h-px bg-line" />
              <div className="h-px border-t border-dashed border-line" />
              <div className="h-px bg-line-strong" />
            </div>

            <ul
              aria-label={`Daily page views, last ${range} days`}
              className={clsx("relative flex items-end justify-between", series.length > 14 ? "gap-[3px]" : "gap-1.5")}
              style={{ height: CHART_HEIGHT }}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {series.map((day, index) => {
                const heightPct = niceMax === 0 ? 0 : (day.count / niceMax) * 100;
                const isHovered = hoverIndex === index;
                return (
                  <li
                    key={day.date}
                    className="flex h-full flex-1 cursor-default items-end justify-center rounded-sm outline-none"
                    tabIndex={0}
                    aria-label={`${day.label}: ${day.count} views`}
                    onMouseEnter={() => setHoverIndex(index)}
                    onFocus={() => setHoverIndex(index)}
                    onBlur={() => setHoverIndex(null)}
                  >
                    <div
                      className={clsx(
                        "w-full max-w-[26px] rounded-t-[3px] transition-[background-color,opacity] duration-150",
                        isHovered ? "bg-accent-bright" : "bg-accent",
                        hoverIndex !== null && !isHovered && "opacity-40"
                      )}
                      style={{ height: `${day.count > 0 ? Math.max(heightPct, 3) : 1}%` }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div aria-hidden className="mt-2 flex justify-between pl-9 font-mono text-[10px] text-faint">
          <span>{series[0]?.label}</span>
          <span>{series[series.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}
