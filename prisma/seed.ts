import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });
  console.log(`Admin user ready: ${adminEmail}`);

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", reviewsSectionShown: true },
  });
  console.log("Site settings initialized");

  await prisma.announcement.upsert({
    where: { id: "seed-announcement-1" },
    update: {},
    create: {
      id: "seed-announcement-1",
      message: "Currently available for new freelance projects!",
      isActive: true,
    },
  });

  const projects = [
    {
      id: "seed-project-1",
      name: "EdTech Learning Portal",
      summary:
        "A full-stack e-learning platform with course management, student dashboards, and progress tracking.",
      liveUrl: "https://example.com",
      techStack: ["Next.js", "PostgreSQL", "Tailwind CSS", "Prisma"],
      featured: true,
      order: 1,
    },
    {
      id: "seed-project-2",
      name: "VTU / Airtime & Data Reseller Platform",
      summary:
        "A SaaS-style VTU platform with wallet funding, Paystack integration, and automated data/airtime delivery.",
      liveUrl: "https://example.com",
      techStack: ["React", "Node.js", "Express", "MongoDB", "Paystack API"],
      featured: true,
      order: 2,
    },
    {
      id: "seed-project-3",
      name: "E-Commerce Storefront",
      summary:
        "A modern storefront with inventory management, cart/checkout flow, and Flutterwave payments.",
      liveUrl: "https://example.com",
      techStack: ["Next.js", "Supabase", "Stripe", "Tailwind CSS"],
      featured: false,
      order: 3,
    },
  ];

  for (const project of projects) {
    const { id, ...data } = project;
    await prisma.project.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
  console.log(`Seeded ${projects.length} sample projects`);

  const reviews = [
    {
      id: "seed-review-1",
      clientName: "Amaka O.",
      rating: 5,
      message: "Ugochukwu delivered our platform ahead of schedule and it looks amazing!",
      status: "APPROVED" as const,
    },
    {
      id: "seed-review-2",
      clientName: "David K.",
      rating: 5,
      message: "Excellent communication and clean, maintainable code. Highly recommended.",
      status: "APPROVED" as const,
    },
  ];

  for (const review of reviews) {
    const { id, ...data } = review;
    await prisma.review.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
  console.log(`Seeded ${reviews.length} sample reviews`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
