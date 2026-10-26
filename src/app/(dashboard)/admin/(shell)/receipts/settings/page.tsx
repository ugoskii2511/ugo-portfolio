import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ReceiptSettingsForm } from "@/components/admin/receipts/settings-form";
import { getReceiptSettings } from "@/lib/receipts";

export const metadata: Metadata = { title: "Receipt settings" };

export default async function ReceiptSettingsPage() {
  const [own, resolved] = await Promise.all([prisma.receiptSettings.findUnique({ where: { id: "singleton" } }), getReceiptSettings()]);
  const value = (v: string | null | undefined) => v ?? "";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Receipts & Payments" title="Receipt settings" description="How new receipts look. Receipts already issued keep exactly what was printed on them." />
      <ReceiptSettingsForm
        initial={{
          businessName: value(own?.businessName),
          logoUrl: value(own?.logoUrl),
          email: value(own?.email),
          phone: value(own?.phone),
          website: value(own?.website),
          address: value(own?.address),
          currency: own?.currency ?? "NGN",
          currencySymbol: own?.currencySymbol ?? "₦",
          numberPrefix: own?.numberPrefix ?? "RCT",
          authorizedName: value(own?.authorizedName),
          authorizedTitle: value(own?.authorizedTitle),
          acknowledgement: value(own?.acknowledgement),
          footerNote: value(own?.footerNote),
        }}
        fallback={{
          businessName: resolved.businessName,
          logoUrl: resolved.logoUrl ?? "",
          email: resolved.email ?? "",
          phone: resolved.phone ?? "",
          website: resolved.website ?? "",
          authorizedName: resolved.authorizedName ?? "",
          acknowledgement: resolved.acknowledgement,
        }}
      />
    </div>
  );
}
