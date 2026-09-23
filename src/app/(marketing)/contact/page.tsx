import type { Metadata } from "next";
import { ContactContent } from "@/components/contact-content";
import { DEFAULT_CONTACT_EMAIL, DEFAULT_WHATSAPP_NUMBER, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Start a project with Ugochukwu Chukwu Christian. Reach out on WhatsApp, by email, or through the project form. Replies usually come the same day.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <ContactContent
      contactEmail={settings?.contactEmail ?? DEFAULT_CONTACT_EMAIL}
      whatsappNumber={settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER}
    />
  );
}
