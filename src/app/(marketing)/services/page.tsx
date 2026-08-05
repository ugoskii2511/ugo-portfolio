import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServicesGrid } from "@/components/services-grid";
import { ServicesGuarantees } from "@/components/services-guarantees";
import { getServiceCategories } from "@/lib/get-service-categories";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Frontend, backend, e-commerce, SaaS, CMS, performance, database, and security services — book any of them directly on WhatsApp.",
};

export default async function ServicesPage() {
  const categories = await getServiceCategories();

  return (
    <div className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Services"
          title={
            <>
              Every service your web project <span className="italic text-primary">needs</span>
            </>
          }
          description="Pick any service below to start a conversation on WhatsApp — I'll reply with next steps and a clear quote."
        />
        <div className="mt-10">
          <ServicesGuarantees />
        </div>
        <div className="mt-16">
          <ServicesGrid categories={categories} />
        </div>
      </Container>
    </div>
  );
}
