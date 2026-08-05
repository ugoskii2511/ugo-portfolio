-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "averageRatingOverride" DOUBLE PRECISION,
ADD COLUMN     "clientReviewsOverride" INTEGER,
ADD COLUMN     "footerBio" TEXT NOT NULL DEFAULT 'Ugochukwu Chukwu Christian — full-stack web developer building fast, modern websites, dashboards, and platforms.',
ADD COLUMN     "heroHeadline" TEXT NOT NULL DEFAULT 'Building fast, modern web experiences that work.',
ADD COLUMN     "projectsDeliveredOverride" INTEGER,
ADD COLUMN     "serviceCategoriesOverride" INTEGER,
ADD COLUMN     "siteDescription" TEXT NOT NULL DEFAULT 'Full-stack web developer building fast, modern websites, SaaS dashboards, e-commerce platforms, and APIs.',
ADD COLUMN     "siteName" TEXT NOT NULL DEFAULT 'Ugochukwu Chukwu Christian',
ADD COLUMN     "siteTagline" TEXT NOT NULL DEFAULT 'Full-Stack Web Developer';

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'code',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
