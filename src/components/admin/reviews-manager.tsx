"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RotateCcw, Star, Trash2, X } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { useToast } from "@/components/admin/toast-provider";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { EmptyState, IconButton, PageHeader, Panel, Segmented, StatusPill, Switch, formatDate, type Tone } from "@/components/admin/ui";
import { adminRequest, errorMessage } from "@/lib/admin-fetch";

export type AdminReview = {
  id: string;
  clientName: string;
  position: string | null;
  rating: number;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type Status = AdminReview["status"];
type Filter = "ALL" | Status;

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Live", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export function ReviewsManager({
  reviews,
  reviewsSectionShown,
  reviewLink,
}: {
  reviews: AdminReview[];
  reviewsSectionShown: boolean;
  reviewLink: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [sectionShown, setSectionShown] = useState(reviewsSectionShown);
  const [isTogglingSection, setIsTogglingSection] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;
  // Start on the moderation queue when there is one.
  const [filter, setFilter] = useState<Filter>(pendingCount > 0 ? "PENDING" : "ALL");

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(reviewLink);
      setIsCopied(true);
      toast.success("Review link copied.");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link. Copy it manually instead.");
    }
  }

  async function handleSectionToggle(value: boolean) {
    setIsTogglingSection(true);
    setSectionShown(value);
    try {
      await adminRequest("/api/settings", { method: "PATCH", body: { reviewsSectionShown: value } });
      toast.success(value ? "Reviews are visible on the site." : "Reviews are hidden sitewide.");
      router.refresh();
    } catch (error) {
      setSectionShown(!value);
      toast.error(errorMessage(error, "Couldn't update that setting."));
    } finally {
      setIsTogglingSection(false);
    }
  }

  async function setStatus(review: AdminReview, status: Status) {
    setBusyId(review.id);
    try {
      await adminRequest(`/api/reviews/${review.id}`, { method: "PATCH", body: { status } });
      toast.success(
        status === "APPROVED"
          ? `${review.clientName}'s review is now live.`
          : status === "REJECTED"
            ? "Review rejected. It won't appear on the site."
            : "Review moved to pending. It is no longer on the site."
      );
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update that review."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(review: AdminReview) {
    const ok = await confirm({
      title: `Delete ${review.clientName}'s review?`,
      description: "It's removed permanently. To just hide it, reject it instead.",
      confirmLabel: "Delete review",
      danger: true,
    });
    if (!ok) return;

    setBusyId(review.id);
    try {
      await adminRequest(`/api/reviews/${review.id}`, { method: "DELETE" });
      toast.success("Review deleted.");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete that review."));
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(
    () => ({
      ALL: reviews.length,
      PENDING: pendingCount,
      APPROVED: reviews.filter((r) => r.status === "APPROVED").length,
      REJECTED: reviews.filter((r) => r.status === "REJECTED").length,
    }),
    [reviews, pendingCount]
  );
  const filtered = filter === "ALL" ? reviews : reviews.filter((r) => r.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Reviews"
        description="Client reviews arrive as pending. Approve them to publish, or reject to keep them off the site."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Collect reviews</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Send this link to clients. Anything submitted waits here until you approve it.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 font-mono text-xs text-fg/85">
              {reviewLink}
            </code>
            <button type="button" onClick={handleCopyLink} className={buttonClass("secondary", "sm", "shrink-0")}>
              {isCopied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {isCopied ? "Copied" : "Copy"}
            </button>
          </div>
        </Panel>

        <Panel className="flex items-start justify-between gap-4 p-5">
          <div>
            <h2 id="reviews-visibility" className="text-sm font-semibold tracking-tight">
              Show reviews on the site
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Off hides every review sitewide (home, case studies and /reviews), whatever their status.
            </p>
            <p className="mt-3">
              <StatusPill tone={sectionShown ? "success" : "neutral"}>{sectionShown ? "Visible" : "Hidden"}</StatusPill>
            </p>
          </div>
          <Switch
            checked={sectionShown}
            onChange={handleSectionToggle}
            disabled={isTogglingSection}
            label="Show reviews on the site"
          />
        </Panel>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-5 w-5" />}
          title="No reviews yet"
          description="Share your review link with a client. Their review shows up here for approval."
          action={
            <button type="button" onClick={handleCopyLink} className={buttonClass("primary", "sm")}>
              Copy review link
            </button>
          }
        />
      ) : (
        <>
          <Segmented
            label="Filter reviews"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "PENDING", label: "Pending", count: counts.PENDING },
              { value: "APPROVED", label: "Live", count: counts.APPROVED },
              { value: "REJECTED", label: "Rejected", count: counts.REJECTED },
              { value: "ALL", label: "All", count: counts.ALL },
            ]}
          />

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-line px-5 py-12 text-center text-sm text-muted">
              {filter === "PENDING" ? "Nothing waiting for approval. You're all caught up." : "No reviews here."}
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {filtered.map((review) => {
                const busy = busyId === review.id;
                return (
                  <Panel as="li" key={review.id} className="flex flex-col">
                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <StatusPill tone={STATUS[review.status].tone}>{STATUS[review.status].label}</StatusPill>
                        <span className="font-mono text-xs tracking-[0.15em] text-accent-bright" aria-label={`Rated ${review.rating} out of 5`}>
                          {"★".repeat(review.rating)}
                          <span className="text-faint">{"★".repeat(5 - review.rating)}</span>
                        </span>
                      </div>
                      <blockquote className="whitespace-pre-line text-pretty text-sm leading-relaxed text-fg/85">
                        &ldquo;{review.message.trim()}&rdquo;
                      </blockquote>
                      <div className="mt-auto flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised-2 text-xs font-medium text-muted"
                        >
                          {review.clientName.replace(/[^\p{L}]/gu, "").charAt(0).toUpperCase() || "·"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{review.clientName}</p>
                          <p className="truncate text-xs text-faint">
                            {review.position ? `${review.position} · ` : ""}
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
                      {review.status !== "APPROVED" && (
                        <button type="button" disabled={busy} onClick={() => setStatus(review, "APPROVED")} className={buttonClass("primary", "sm")}>
                          <Check className="h-4 w-4" aria-hidden />
                          Approve
                        </button>
                      )}
                      {review.status === "PENDING" && (
                        <button type="button" disabled={busy} onClick={() => setStatus(review, "REJECTED")} className={buttonClass("secondary", "sm")}>
                          <X className="h-4 w-4" aria-hidden />
                          Reject
                        </button>
                      )}
                      {review.status === "APPROVED" && (
                        <button type="button" disabled={busy} onClick={() => setStatus(review, "PENDING")} className={buttonClass("secondary", "sm")}>
                          <X className="h-4 w-4" aria-hidden />
                          Unpublish
                        </button>
                      )}
                      {review.status === "REJECTED" && (
                        <button type="button" disabled={busy} onClick={() => setStatus(review, "PENDING")} className={buttonClass("ghost", "sm", "!px-3")}>
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          Back to pending
                        </button>
                      )}
                      <IconButton
                        label={`Delete review from ${review.clientName}`}
                        tone="danger"
                        disabled={busy}
                        onClick={() => handleDelete(review)}
                        className="ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </Panel>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
