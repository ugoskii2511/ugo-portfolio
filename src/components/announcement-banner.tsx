"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";

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
          className="overflow-hidden bg-gradient-to-r from-primary to-primary-dark text-white"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2.5 text-center text-sm">
            <Megaphone className="h-4 w-4 shrink-0" />
            <span>{announcement.message}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="ml-auto shrink-0 rounded-full p-1 transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
