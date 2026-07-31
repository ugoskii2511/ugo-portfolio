"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { StarRating } from "@/components/star-rating";
import { Reveal } from "@/components/reveal";
import { useSpotlight } from "@/lib/use-spotlight";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";

export type AdminReview = {
  id: string;
  clientName: string;
  rating: number;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;
type Filter = (typeof FILTERS)[number];

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
        checked ? "bg-gradient-to-r from-primary to-primary-dark" : "bg-foreground/20"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function ReviewsManager({
  reviews,
  reviewsSectionShown,
}: {
  reviews: AdminReview[];
  reviewsSectionShown: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isTogglingSection, setIsTogglingSection] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  async function handleSectionToggle(value: boolean) {
    setIsTogglingSection(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewsSectionShown: value }),
      });
      toast.success(value ? "Reviews section is now visible." : "Reviews section hidden sitewide.");
      router.refresh();
    } catch {
      toast.error("Couldn't update that setting.");
    } finally {
      setIsTogglingSection(false);
    }
  }

  async function handleApproveToggle(review: AdminReview, approved: boolean) {
    setUpdatingId(review.id);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: approved ? "APPROVED" : "PENDING" }),
      });
      if (!response.ok) throw new Error("Failed");
      toast.success(approved ? "Review approved and now live." : "Review moved back to pending.");
      router.refresh();
    } catch {
      toast.error("Couldn't update that review.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(review: AdminReview) {
    const ok = await confirm({
      title: `Delete review from ${review.clientName}?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(review.id);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      toast.success("Review deleted.");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that review.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(
    () => (filter === "ALL" ? reviews : reviews.filter((r) => r.status === filter)),
    [reviews, filter]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Approve reviews to publish them, or hide the whole section.
        </p>
      </div>

      <div className="glass-panel flex items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <h3 className="font-semibold">Show Reviews Section on public site</h3>
          <p className="mt-1 text-sm text-foreground/60">
            Turning this off hides the entire reviews section sitewide, regardless of individual
            approvals.
          </p>
        </div>
        <Switch checked={reviewsSectionShown} onChange={handleSectionToggle} disabled={isTogglingSection} />
      </div>

      {reviews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                filter === f
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white"
                  : "border border-border-subtle text-foreground/60 hover:border-primary/40 hover:text-foreground"
              )}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              <span className="ml-1.5 opacity-70">
                {f === "ALL" ? reviews.length : reviews.filter((r) => r.status === f).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No reviews submitted yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-foreground/60">
          No reviews in this category.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((review, index) => (
            <ReviewRow
              key={review.id}
              review={review}
              index={index}
              isUpdating={updatingId === review.id}
              isDeleting={deletingId === review.id}
              onApproveToggle={(value) => handleApproveToggle(review, value)}
              onDelete={() => handleDelete(review)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  review,
  index,
  isUpdating,
  isDeleting,
  onApproveToggle,
  onDelete,
}: {
  review: AdminReview;
  index: number;
  isUpdating: boolean;
  isDeleting: boolean;
  onApproveToggle: (value: boolean) => void;
  onDelete: () => void;
}) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useSpotlight();
  const isApproved = review.status === "APPROVED";

  return (
    <Reveal
      delay={Math.min(index, 6) * 40}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glass-panel relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="pointer-events-none absolute inset-0" style={spotlightStyle} />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold">{review.clientName}</h3>
          <StarRating value={review.rating} />
          <span
            className={clsx(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              isApproved
                ? "bg-emerald-500/10 text-emerald-600"
                : review.status === "REJECTED"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-amber-500/10 text-amber-600"
            )}
          >
            {review.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-foreground/70">&ldquo;{review.message}&rdquo;</p>
        <p className="mt-1 text-xs text-foreground/50">
          {new Date(review.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
        </p>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          Approved
          <Switch checked={isApproved} onChange={onApproveToggle} disabled={isUpdating} />
        </label>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          aria-label={`Delete review from ${review.clientName}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reveal>
  );
}
