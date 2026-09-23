"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const DISMISSED_KEY = "dismissed-announcement-id";

export function AnnouncementBanner({
  announcement,
}: {
  announcement: { id: string; message: string } | null;
}) {
  // Defaults to visible: most visitors haven't dismissed it, and starting
  // hidden then growing open a beat after mount caused a layout shift that
  // pushed the whole page (including the hero) down right as it rendered.
  // Only visitors who already dismissed this exact announcement flip to
  // hidden, which is a rarer, less disruptive shrink-away instead.
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!announcement) return;
    const dismissedId = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissedId === announcement.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDismissed(true);
    }
  }, [announcement]);

  if (!announcement) return null;

  function dismiss() {
    if (!announcement) return;
    sessionStorage.setItem(DISMISSED_KEY, announcement.id);
    setIsDismissed(true);
  }

  return (
    <AnimatePresence initial={false}>
      {!isDismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative z-50 overflow-hidden border-b border-line bg-accent-soft text-fg"
        >
          <div className="mx-auto flex max-w-[80rem] items-center justify-center gap-3 px-5 py-2 text-center text-[0.8rem] sm:px-8 lg:px-12">
            <span className="live-dot shrink-0" aria-hidden />
            <span>{announcement.message}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
