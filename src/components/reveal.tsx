"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { clsx } from "clsx";
import { useHasMounted } from "@/lib/use-has-mounted";

interface RevealProps extends HTMLAttributes<HTMLElement> {
  delay?: number;
  /// Rendered element; use "li" inside lists to keep the markup valid.
  as?: "div" | "li" | "article" | "section";
}

/// Scroll/mount reveal built on a real IntersectionObserver + CSS
/// transition, not Framer Motion's `whileInView`/`initial` props.
///
/// Framer Motion deliberately renders server-rendered content already at
/// its final "animate" state (documented SSR behavior, meant to avoid a
/// permanently-invisible flash for no-JS visitors) — which means its enter
/// transitions never play for anything present in the first HTML payload,
/// only for content that mounts later inside an already-running client
/// app. Since nearly everything on this site IS part of that first
/// payload, `whileInView` silently never animated on a fresh load. This
/// component sidesteps that: it defaults to fully visible (same safe
/// no-JS fallback), and only *after* mount does it drop into a hidden
/// state and observe, so the reveal-in transition genuinely runs for
/// JS-enabled visitors regardless of hydration timing.
export function Reveal({ delay = 0, as: Tag = "div", className, style, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const mounted = useHasMounted();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!mounted || !el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  const revealed = !mounted || isVisible;

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      style={{ ...style, transitionDelay: revealed ? `${delay}ms` : "0ms" }}
      className={clsx(
        "transition-[opacity,transform,translate,border-color,background-color] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        revealed ? "opacity-100 translate-y-0" : "translate-y-5 opacity-0",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
