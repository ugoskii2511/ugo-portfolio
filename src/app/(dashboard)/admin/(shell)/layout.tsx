import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/authGuard";
import { AdminShell } from "@/components/admin/sidebar";
import { AdminProviders } from "@/components/admin/providers";

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy (src/proxy.ts) already guards /admin/* at the edge; this check
  // is defense in depth in case the route is ever reached without it.
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminProviders>
      <AdminShell email={session.email}>{children}</AdminShell>
    </AdminProviders>
  );
}
