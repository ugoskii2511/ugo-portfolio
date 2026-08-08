"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { StarRating } from "@/components/star-rating";

type Status = "idle" | "submitting" | "success" | "error";

export function ReviewForm({ onSuccess }: { onSuccess?: () => void }) {
  const [clientName, setClientName] = useState("");
  const [position, setPosition] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, position, rating, message, honeypot }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
      onSuccess?.();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-14 w-14 text-primary" />
        <h3 className="text-xl font-semibold">Thank you!</h3>
        <p className="text-sm text-foreground/70">
          Your review has been submitted and will appear here once it&apos;s approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        name="company"
        id="review-company"
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
        <span className="font-medium">Your Position</span>
        <input
          required
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          placeholder="e.g. CEO, Marketing Manager"
          className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Rating</span>
        <StarRating value={rating} onChange={setRating} size={24} />
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Your Review</span>
        <textarea
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          placeholder="Tell us about your experience working with Ugochukwu..."
          className="resize-none rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
        />
      </label>

      {status === "error" && <p className="text-sm text-red-500">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-60"
      >
        {status === "submitting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Submit Review
      </button>
    </form>
  );
}
