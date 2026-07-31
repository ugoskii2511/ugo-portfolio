-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "aboutBio" TEXT NOT NULL DEFAULT 'I''m a full-stack web developer who builds fast, modern websites, SaaS dashboards, e-commerce platforms, and APIs — end to end. From the first line of frontend code to the database schema powering it, I care about the details that make software feel solid: clean architecture, thoughtful UX, and code that doesn''t fall apart six months after launch.

Whether you need a marketing site, a full e-commerce store, or a custom SaaS platform with dashboards and auth, I work directly with you — no account managers, no middlemen — from planning through to launch.

My approach is simple: understand the problem before writing code, keep you informed at every stage, and ship something you can confidently hand off to any other developer later — well-structured, documented, and free of vendor lock-in.',
ADD COLUMN     "availabilityStatus" TEXT NOT NULL DEFAULT 'Open for New Projects',
ADD COLUMN     "contactEmail" TEXT NOT NULL DEFAULT 'elitetechsolutions607@gmail.com',
ADD COLUMN     "heroIntro" TEXT NOT NULL DEFAULT 'I''m Ugochukwu Chukwu Christian, a full-stack developer helping founders and businesses ship websites, dashboards, e-commerce stores, and SaaS platforms that actually convert.',
ADD COLUMN     "whatsappNumber" TEXT NOT NULL DEFAULT '2349065606430';
