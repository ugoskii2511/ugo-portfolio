import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Wrap } from "@/components/site/wrap";
import { SectionIntro } from "@/components/site/section-intro";
import { Reveal } from "@/components/reveal";
import { FinalCta } from "@/components/home/final-cta";
import { DEFAULT_CONTACT_EMAIL, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Availability updates and news from Ugochukwu Chukwu Christian.",
  alternates: { canonical: "/announcements" },
};

export default async function AnnouncementsPage() {
  const now = new Date();
  const [announcements, settings] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
  ]);

  return (
    <>
      <section className="pb-24 pt-16 sm:pb-32 sm:pt-24">
        <Wrap>
          <SectionIntro
            headingLevel={1}
            label="Announcements"
            title="Updates."
            description="Availability, openings and news, straight from me."
          />
          <div className="mt-14 lg:mt-20">
            {announcements.length === 0 ? (
              <p className="border-t border-line pt-8 text-muted">Nothing new right now.</p>
            ) : (
              <ol className="border-t border-line">
                {announcements.map((announcement, index) => (
                  <Reveal
                    as="li"
                    key={announcement.id}
                    delay={index * 60}
                    className="grid gap-3 border-b border-line py-8 md:grid-cols-12 md:gap-10"
                  >
                    <time
                      dateTime={announcement.createdAt.toISOString()}
                      className="label-mono md:col-span-3 md:pt-1.5"
                    >
                      {announcement.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    <p className="text-pretty text-xl leading-snug tracking-tight md:col-span-9">
                      {announcement.message}
                    </p>
                  </Reveal>
                ))}
              </ol>
            )}
          </div>
        </Wrap>
      </section>
      <FinalCta contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL} />
    </>
  );
}
