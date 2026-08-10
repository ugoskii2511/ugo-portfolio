import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProcessStepsGrid, type ProcessStepEntry } from "@/components/process-steps-grid";
import { SectionCta } from "@/components/section-cta";

export function Process({ steps }: { steps: ProcessStepEntry[] }) {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="How We Work"
          title={
            <>
              Our <span className="italic text-primary">process</span>
            </>
          }
          description="A clear, collaborative path from first conversation to finished product."
        />

        <div className="mt-12">
          <ProcessStepsGrid steps={steps} />
        </div>
        <SectionCta label="Curious how your project would move through this process?" />
      </Container>
    </section>
  );
}
