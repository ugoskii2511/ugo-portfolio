import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ContactContent } from "@/components/contact-content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Ugochukwu Chukwu Christian via WhatsApp, email, or the project form.",
};

export default async function ContactPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });

  return (
    <ContactContent
      contactEmail={settings?.contactEmail ?? "elitetechsolutions607@gmail.com"}
      whatsappNumber={settings?.whatsappNumber ?? "2349065606430"}
    />
  );
}
