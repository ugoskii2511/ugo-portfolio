import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

const BASE =
  "group/btn relative inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(61,107,255,0.6)] hover:bg-[#4f79ff] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_32px_-8px_rgba(61,107,255,0.8)]",
  secondary:
    "border border-line-strong bg-white/[0.02] text-fg hover:border-white/25 hover:bg-white/[0.06]",
  ghost: "text-fg hover:text-accent-bright",
};

const SIZES: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-[0.95rem]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return clsx(BASE, VARIANTS[variant], SIZES[size], className);
}

/// Arrow that nudges on hover: "out" (↗) for leaving/starting something,
/// "right" (→) for in-site navigation.
export function ButtonArrow({ kind = "right" }: { kind?: "right" | "out" }) {
  const Icon = kind === "out" ? ArrowUpRight : ArrowRight;
  return (
    <Icon
      aria-hidden
      className={clsx(
        "h-4 w-4 shrink-0 transition-transform duration-300 ease-out",
        kind === "out"
          ? "group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
          : "group-hover/btn:translate-x-0.5"
      )}
    />
  );
}

type LinkButtonProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: "right" | "out" | false;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "className" | "children">;

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  arrow = "right",
  children,
  className,
  ...rest
}: LinkButtonProps) {
  const external = /^(https?:|mailto:|tel:)/.test(href);
  const classes = buttonClass(variant, size, className);
  const content = (
    <>
      {children}
      {arrow && <ButtonArrow kind={arrow} />}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...rest}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {content}
    </Link>
  );
}
