-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "category" TEXT,
ADD COLUMN     "challenge" TEXT,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lead" TEXT,
ADD COLUMN     "priceMaxNaira" INTEGER,
ADD COLUMN     "priceMinNaira" INTEGER,
ADD COLUMN     "pricingPackage" TEXT,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "solution" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "deadline" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "estimateAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "features" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'booking',
ADD COLUMN     "sourceProject" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "pricingConfig" JSONB,
ADD COLUMN     "pricingDisclaimer" TEXT;


-- Development estimates can never go below the ₦150,000 floor, and a range
-- must run low → high. Enforced by the database as well as the app.
ALTER TABLE "Project" ADD CONSTRAINT "Project_price_min_floor" CHECK ("priceMinNaira" IS NULL OR "priceMinNaira" >= 150000);
ALTER TABLE "Project" ADD CONSTRAINT "Project_price_range_order" CHECK ("priceMaxNaira" IS NULL OR ("priceMinNaira" IS NOT NULL AND "priceMaxNaira" >= "priceMinNaira"));
