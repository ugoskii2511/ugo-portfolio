/// The current promo, taken word for word from the flyer
/// (public/promo/business-website-promo.jpg). Set `active` to false to take
/// the promo off the site: the nav link, homepage section and /promo page
/// all follow it.

export const PROMO = {
  active: true,
  path: "/promo",
  eyebrow: "Limited time offer",
  title: "Get your business online",
  subtitle: "with a professional website + free .name.ng domain & free hosting",
  intro:
    "Your business deserves more than just social media. Get a modern, professional website that helps you attract more customers, build trust and grow faster.",
  priceNaira: 150_000,
  bonus: "Free .name.ng domain & 1 year hosting",
  slots: 5,
  tagline: "Your vision. Our code.",
  closing: "Because your business deserves a website.",
  whatsappMessage:
    "Hello Ugochukwu, I saw your ₦150,000 website promo (free .name.ng domain & 1 year hosting). I'd like a free consultation.",
  image: {
    src: "/promo/business-website-promo.jpg",
    width: 1024,
    height: 1536,
    alt: "Promo flyer: Get your business online with a professional website, free .name.ng domain and free hosting. Promo price ₦150,000. Only 5 slots available.",
  },
  includes: [
    { key: "design", title: "Custom-designed website", text: "A unique design that fits your brand and goals." },
    { key: "mobile", title: "Mobile-friendly design", text: "Looks great on all devices." },
    { key: "whatsapp", title: "WhatsApp integration", text: "Let customers reach you instantly." },
    { key: "contact", title: "Contact form", text: "Capture enquiries 24/7." },
    { key: "seo", title: "Basic SEO setup", text: "Help search engines find your business." },
    { key: "social", title: "Social media integration", text: "Connect your platforms and grow your audience." },
    { key: "ssl", title: "SSL security", text: "Keeps your site safe and builds trust." },
    { key: "support", title: "30 days post-launch support", text: "We're here even after launch." },
    { key: "domain", title: "Free .name.ng domain", text: "Your own domain name for the first year." },
    { key: "hosting", title: "Free hosting", text: "Keep your website online for the first year." },
    { key: "revisions", title: "Two rounds of revisions", text: "We make sure it's perfect for you." },
  ],
  perfectFor: [
    "Small & growing businesses",
    "Fashion brands",
    "Consultants & service providers",
    "Schools & educational businesses",
    "Product-based businesses",
    "Startups & entrepreneurs",
  ],
  promises: ["Professional & reliable", "Fast delivery", "Dedicated support"],
  terms: [
    "Limited slots available.",
    "Free domain registration is subject to availability.",
    "Hosting is free for the first year.",
    "Domain renewal is the customer's responsibility.",
  ],
} as const;

export type PromoInclude = (typeof PROMO.includes)[number];

export function promoPrice() {
  return `₦${PROMO.priceNaira.toLocaleString("en-NG")}`;
}
