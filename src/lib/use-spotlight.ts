import { useCallback, useState, type CSSProperties, type MouseEvent } from "react";

/// Cursor-tracked radial glow for card hover states. Spread the returned
/// handlers onto a `relative overflow-hidden` element, then render a
/// `<div className="pointer-events-none absolute inset-0" style={spotlightStyle} />`
/// as its first child.
export function useSpotlight(color: string = "var(--color-primary)") {
  const [spotlightStyle, setSpotlightStyle] = useState<CSSProperties>({
    opacity: 0,
    transition: "opacity 0.3s ease",
  });

  const onMouseMove = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setSpotlightStyle({
        opacity: 1,
        transition: "opacity 0.3s ease",
        background: `radial-gradient(400px circle at ${x}% ${y}%, color-mix(in srgb, ${color} 16%, transparent), transparent 70%)`,
      });
    },
    [color]
  );

  const onMouseLeave = useCallback(() => {
    setSpotlightStyle((style) => ({ ...style, opacity: 0 }));
  }, []);

  return { onMouseMove, onMouseLeave, spotlightStyle };
}
