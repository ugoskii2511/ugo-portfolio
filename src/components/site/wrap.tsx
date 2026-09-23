import { clsx } from "clsx";
import type { ElementType, ReactNode } from "react";

/// The site's single content column. Its edges line up with the fixed
/// blueprint rails (see `.rails` in globals.css).
export function Wrap({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={clsx("relative mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-12", className)}>
      {children}
    </Tag>
  );
}
