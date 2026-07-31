"use client";

import { useState } from "react";
import type { DailyPageViews } from "@/lib/analytics";

const CHART_HEIGHT = 160;

function niceCeiling(value: number): number {
  if (value <= 5) return Math.max(value, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

export function PageViewsChart({ data }: { data: DailyPageViews[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const maxValue = Math.max(0, ...data.map((d) => d.count));
  const niceMax = niceCeiling(maxValue);

  return (
    <div className="w-full">
      <div className="flex gap-3">
        <div
          className="flex shrink-0 flex-col justify-between py-0.5 text-right text-[10px] tabular-nums text-foreground/40"
          style={{ height: CHART_HEIGHT }}
          aria-hidden
        >
          <span>{niceMax.toLocaleString()}</span>
          <span>{Math.round(niceMax / 2).toLocaleString()}</span>
          <span>0</span>
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <div className="h-px bg-border-subtle" />
            <div className="h-px bg-border-subtle" />
            <div className="h-px bg-border-subtle" />
          </div>

          <div className="relative flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
            {data.map((day, index) => {
              const heightPct = niceMax === 0 ? 0 : (day.count / niceMax) * 100;
              const isHovered = hoverIndex === index;
              return (
                <div
                  key={day.date}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  tabIndex={0}
                  onFocus={() => setHoverIndex(index)}
                  onBlur={() => setHoverIndex(null)}
                >
                  {isHovered && (
                    <div className="pointer-events-none absolute -top-9 z-20 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg">
                      <span className="font-semibold tabular-nums">{day.count}</span>{" "}
                      <span className="opacity-70">· {day.label}</span>
                    </div>
                  )}
                  <div
                    className="w-full max-w-[22px] rounded-t-[4px] bg-primary transition-opacity duration-150"
                    style={{
                      height: `${day.count > 0 ? Math.max(heightPct, 4) : 1}%`,
                      opacity: hoverIndex === null || isHovered ? 1 : 0.45,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-[calc(2.25rem+0.75rem)] text-[10px] text-foreground/40">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
