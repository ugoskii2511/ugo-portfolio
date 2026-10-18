import type { Metadata } from "next";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { WorkCard } from "@/components/work/work-card";
import { FinalCta } from "@/components/home/final-cta";
import { getShowcaseProjects } from "@/lib/projects";
import { DEFAULT_CONTACT_EMAIL, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected work by Ugochukwu Chukwu Christian: fintech and VTU platforms, e-commerce stores, and websites for schools, agencies and businesses, all live in production.",
  alternates: { canonical: "/work" },
};

export default async function WorkPage() {
  const [projects, settings] = await Promise.all([getShowcaseProjects(), getSettings()]);

  return (
    <>
      <section className="pb-24 pt-16 sm:pb-32 sm:pt-24">
        <Wrap>
          <SectionIntro
            headingLevel={1}
            label="Work"
            title="Everything here is live, and in use."
            description="Platforms, stores and websites built for real businesses. Open any project for the story behind it."
          />

          {projects.length === 0 ? (
            <p className="mt-20 text-muted">New work is on the way. Check back shortly.</p>
          ) : (
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:gap-6">
              {projects.map((project, index) => (
                <WorkCard key={project.id} project={project} index={index} />
              ))}
            </ul>
          )}
        </Wrap>
      </section>
      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
