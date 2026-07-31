import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Availability updates and news from Ugochukwu Chukwu Christian.",
};

export default async function AnnouncementsPage() {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="py-20">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="Announcements"
          title={
            <>
              Latest <span className="italic text-primary">updates</span>
            </>
          }
          description="Availability, offers, and news — straight from me."
        />

        <div className="mt-12 flex flex-col gap-4">
          {announcements.length === 0 ? (
            <p className="text-center text-foreground/60">No announcements right now.</p>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="glass-panel flex items-start gap-4 rounded-2xl p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-foreground/90">{announcement.message}</p>
                  <p className="mt-1 text-xs text-foreground/50">
                    {new Date(announcement.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Container>
    </div>
  );
}
