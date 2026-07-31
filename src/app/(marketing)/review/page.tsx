import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ReviewForm } from "@/components/review-form";

export const metadata: Metadata = {
  title: "Leave a Review",
  description: "Share your experience working with Ugochukwu Chukwu Christian.",
};

export default function LeaveReviewPage() {
  return (
    <div className="py-20">
      <Container className="max-w-lg">
        <SectionHeading eyebrow="Feedback" title="Leave a review" align="left" />
        <div className="glass-panel mt-8 rounded-2xl p-6 sm:p-8">
          <ReviewForm />
        </div>
      </Container>
    </div>
  );
}
