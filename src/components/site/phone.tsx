import Image from "next/image";
import { clsx } from "clsx";

/// A device frame for the portfolio's portrait phone screenshots (they
/// include the real iOS status bar, which reads naturally inside a frame).
/// Taller screenshots pan top→bottom while the surrounding `.group` is
/// hovered or focused.
export function Phone({
  src,
  alt,
  sizes,
  className,
  eager = false,
  pan = true,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  eager?: boolean;
  pan?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative rounded-[2.1rem] border border-white/10 bg-[#0c0d10] p-[7px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        className
      )}
    >
      <div
        className={clsx(
          "relative aspect-[10/16] overflow-hidden rounded-[1.65rem] bg-raised-2",
          pan && "screen-pan"
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover object-top"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
          />
        ) : (
          <div className="blueprint-grid absolute inset-0" aria-hidden />
        )}
      </div>
    </div>
  );
}
