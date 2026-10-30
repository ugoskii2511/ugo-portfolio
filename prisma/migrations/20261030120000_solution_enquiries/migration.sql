
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "answers" JSONB,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "service" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_service_status_idx" ON "Booking"("service", "status");

