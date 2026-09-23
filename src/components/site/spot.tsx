"use client";

import { clsx } from "clsx";
import type { HTMLAttributes, PointerEvent } from "react";

/// A surface with a cursor-following glow (`.spot` in globals.css). The
/// position is written as CSS variables directly: no state, no re-render.
export function Spot({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }
  return (
    <div onPointerMove={onPointerMove} className={clsx("spot relative", className)} {...rest}>
      {children}
    </div>
  );
}
