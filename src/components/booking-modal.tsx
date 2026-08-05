"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, MessageCircle, X } from "lucide-react";
import { trackEvent } from "@/lib/track";
import { serviceCategories } from "@/lib/services-data";

type BookingModalContextValue = {
  openBooking: (serviceName: string) => void;
};

const BookingModalContext = createContext<BookingModalContextValue | null>(null);

export function useBookingModal() {
  const context = useContext(BookingModalContext);
  if (!context) {
    throw new Error("useBookingModal must be used within a BookingModalProvider");
  }
  return context;
}

type Status = "idle" | "submitting" | "success" | "error";

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectType, setProjectType] = useState("");
  const [clientName, setClientName] = useState("");
  const [budget, setBudget] = useState("");
  const [details, setDetails] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const reset = useCallback(() => {
    setClientName("");
    setBudget("");
    setDetails("");
    setHoneypot("");
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const openBooking = useCallback(
    (serviceName: string) => {
      reset();
      setProjectType(serviceName);
      setIsOpen(true);
      trackEvent("BOOKING_CLICK", serviceName);
    },
    [reset]
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, budget, projectType, details, honeypot }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <BookingModalContext.Provider value={{ openBooking }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Book a service"
              className="glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 sm:p-8"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-full p-1.5 text-foreground/60 transition hover:bg-primary-soft hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              {status === "success" ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <CheckCircle2 className="h-14 w-14 text-primary" />
                  <h3 className="text-xl font-semibold">You&apos;re all set!</h3>
                  <p className="text-sm text-foreground/70">
                    A WhatsApp chat with Ugochukwu should have opened in a new tab. If it
                    didn&apos;t, tap the button below.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Book this service</h3>
                    <p className="mt-1 text-sm text-foreground/70">
                      Fill this in and we&apos;ll continue the conversation on WhatsApp.
                    </p>
                  </div>

                  <input
                    type="text"
                    name="company"
                    id="booking-company"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
                  />

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Your Name</span>
                    <input
                      required
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Estimated Budget</span>
                    <input
                      required
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      placeholder="e.g. ₦300,000 or $500"
                      className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Type of Website / Project</span>
                    <select
                      required
                      value={projectType}
                      onChange={(event) => setProjectType(event.target.value)}
                      className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                    >
                      <option value="General Inquiry">General Inquiry / Not sure yet</option>
                      {serviceCategories.map((category) => (
                        <optgroup key={category.id} label={category.title}>
                          {category.services.map((service) => (
                            <option key={service.id} value={service.title}>
                              {service.title}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Project Brief / Extra Info</span>
                    <textarea
                      required
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      rows={3}
                      placeholder="Tell me a bit about what you need..."
                      className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
                    />
                  </label>

                  {status === "error" && (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-60"
                  >
                    {status === "submitting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    Continue on WhatsApp
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </BookingModalContext.Provider>
  );
}
