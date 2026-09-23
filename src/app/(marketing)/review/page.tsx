import type { Metadata } from "next";
import { Wrap } from "@/components/site/wrap";
import { ReviewForm } from "@/components/review-form";

export const metadata: Metadata = {
  title: "Leave a review",
  description: "Worked with Ugochukwu Chukwu Christian? Share your experience.",
  alternates: { canonical: "/review" },
};

export default function LeaveReviewPage() {
  return (
    <section className="pb-24 pt-16 sm:pb-32 sm:pt-24">
      <Wrap className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <p className="label-mono reveal-up">Feedback</p>
          <h1 className="display reveal-up mt-6 text-balance text-5xl sm:text-6xl" style={{ animationDelay: "80ms" }}>
            How did it go?
          </h1>
          <p className="reveal-up mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted" style={{ animationDelay: "160ms" }}>
            If we&apos;ve worked together, an honest review helps future clients decide, and helps me get better.
            Reviews appear once approved.
          </p>
        </div>
        <div className="reveal-up lg:col-span-6 lg:col-start-7" style={{ animationDelay: "240ms" }}>
          <div className="edge relative rounded-[1.4rem] p-6 sm:p-8">
            <ReviewForm />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
