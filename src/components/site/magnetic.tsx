"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/// Pulls its child a few pixels toward the cursor. Fine pointers only, and
/// skipped under prefers-reduced-motion. Writes the transform straight to
/// the DOM so pointer moves never trigger a React render.
export function Magnetic({ children, strength = 0.2 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) * strength;
    const y = (event.clientY - (rect.top + rect.height / 2)) * strength;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function onPointerLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <span
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="inline-flex transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
    >
      {children}
    </span>
  );
}
