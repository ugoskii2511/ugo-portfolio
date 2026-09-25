import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SiteContentManager } from "@/components/admin/site-content-manager";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Site Content" };

export default async function AdminContentPage() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Site"
        title="Site content"
        description="The words across your public site. Changes go live the moment you save, with no redeploy."
      />

      <SiteContentManager
        initialValues={{
          availabilityStatus: settings.availabilityStatus,
          heroHeadline: settings.heroHeadline,
          heroIntro: settings.heroIntro,
          aboutBio: settings.aboutBio,
          contactEmail: settings.contactEmail,
          whatsappNumber: settings.whatsappNumber,
          siteName: settings.siteName,
          siteTagline: settings.siteTagline,
          siteDescription: settings.siteDescription,
          footerBio: settings.footerBio,
        }}
        initialStatOverrides={{
          projectsDeliveredOverride: settings.projectsDeliveredOverride?.toString() ?? "",
          clientReviewsOverride: settings.clientReviewsOverride?.toString() ?? "",
          serviceCategoriesOverride: settings.serviceCategoriesOverride?.toString() ?? "",
          averageRatingOverride: settings.averageRatingOverride?.toString() ?? "",
        }}
      />
    </div>
  );
}
