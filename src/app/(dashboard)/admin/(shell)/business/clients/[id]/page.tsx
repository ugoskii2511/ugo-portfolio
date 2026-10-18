import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClientProfile } from "@/components/admin/business/client-profile";
import { clientProjectOptions, loadProjects, summariseClient, toExpenseView, toPaymentView } from "@/lib/business";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  const include = { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } } as const;
  const [projects, deletedProjects, payments, expenses, options] = await Promise.all([
    loadProjects({ clientId: id, deletedAt: null }),
    loadProjects({ clientId: id, deletedAt: { not: null } }),
    prisma.clientPayment.findMany({ where: { clientId: id }, orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }], include }),
    prisma.expense.findMany({ where: { OR: [{ clientId: id }, { project: { clientId: id } }] }, orderBy: { spentOn: "desc" }, include }),
    clientProjectOptions(),
  ]);

  const summary = summariseClient(client, projects);
  return (
    <ClientProfile
      client={{
        id: client.id,
        name: client.name,
        businessName: client.businessName,
        phone: client.phone,
        email: client.email,
        whatsapp: client.whatsapp,
        notes: client.notes,
        createdAt: client.createdAt.toISOString(),
        deleted: client.deletedAt !== null,
      }}
      summary={summary}
      projects={projects}
      deletedProjects={deletedProjects}
      // A payment on a deleted project is out of the totals; show it as such.
      payments={payments.map((p) => ({ ...toPaymentView(p), projectDeleted: deletedProjects.some((d) => d.id === p.projectId) }))}
      expenses={expenses.map(toExpenseView)}
      options={options}
    />
  );
}
