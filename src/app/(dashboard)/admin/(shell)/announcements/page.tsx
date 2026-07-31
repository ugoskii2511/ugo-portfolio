import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AnnouncementsManager
      announcements={announcements.map((announcement) => ({
        id: announcement.id,
        message: announcement.message,
        isActive: announcement.isActive,
        createdAt: announcement.createdAt.toISOString(),
      }))}
    />
  );
}
