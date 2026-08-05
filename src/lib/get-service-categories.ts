import { prisma } from "@/lib/db";
import type { ServiceCategory, ServiceIcon } from "@/lib/services-data";

/// Fetches the live, admin-editable services catalog in the same shape the
/// public components expect (see src/lib/services-data.ts, now seed-only).
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { order: "asc" },
    include: { services: { orderBy: { order: "asc" } } },
  });

  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    description: category.description,
    icon: category.icon as ServiceIcon,
    services: category.services.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
    })),
  }));
}
