import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ServicesManager } from "@/components/admin/services-manager";
import type { ServiceIcon } from "@/lib/services-data";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { order: "asc" },
    include: { services: { orderBy: { order: "asc" } } },
  });

  return (
    <ServicesManager
      categories={categories.map((category) => ({
        id: category.id,
        title: category.title,
        description: category.description,
        icon: category.icon as ServiceIcon,
        order: category.order,
        services: category.services,
      }))}
    />
  );
}
