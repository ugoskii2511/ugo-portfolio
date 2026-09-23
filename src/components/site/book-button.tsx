"use client";

import type { ReactNode } from "react";
import { useBookingModal } from "@/components/booking-modal";
import { ButtonArrow, buttonClass, type ButtonSize, type ButtonVariant } from "@/components/site/button";
import { Magnetic } from "@/components/site/magnetic";

/// Opens the WhatsApp booking modal. `service` pre-selects the project type.
export function BookButton({
  children,
  service = "General Inquiry",
  variant = "primary",
  size = "md",
  arrow = "out",
  magnetic = false,
  className,
  onClick,
}: {
  children: ReactNode;
  service?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: "right" | "out" | false;
  magnetic?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const { openBooking } = useBookingModal();
  const button = (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        openBooking(service);
      }}
      className={buttonClass(variant, size, className)}
    >
      {children}
      {arrow && <ButtonArrow kind={arrow} />}
    </button>
  );
  return magnetic ? <Magnetic>{button}</Magnetic> : button;
}
