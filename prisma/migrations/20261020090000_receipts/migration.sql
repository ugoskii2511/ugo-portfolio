-- CreateEnum
CREATE TYPE "ClientPaymentStatus" AS ENUM ('CONFIRMED', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('ISSUED', 'VOIDED');

-- AlterTable
ALTER TABLE "ClientProject" ADD COLUMN     "additionalChargesKobo" BIGINT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "discountKobo" BIGINT,
ADD COLUMN     "referenceNumber" TEXT;

-- AlterTable
ALTER TABLE "ClientPayment" ADD COLUMN     "description" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "ClientPaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "statusReason" TEXT;

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'ISSUED',
    "issueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptCounter" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "ReceiptSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "businessName" TEXT,
    "logoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "currencySymbol" TEXT NOT NULL DEFAULT '₦',
    "numberPrefix" TEXT NOT NULL DEFAULT 'RCT',
    "authorizedName" TEXT,
    "authorizedTitle" TEXT,
    "acknowledgement" TEXT,
    "footerNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");

-- CreateIndex
CREATE INDEX "Receipt_clientId_idx" ON "Receipt"("clientId");

-- CreateIndex
CREATE INDEX "Receipt_projectId_idx" ON "Receipt"("projectId");

-- CreateIndex
CREATE INDEX "Receipt_paymentId_idx" ON "Receipt"("paymentId");

-- CreateIndex
CREATE INDEX "Receipt_status_issueDate_idx" ON "Receipt"("status", "issueDate");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ClientPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- At most one valid (issued) receipt per payment; voided ones are kept.
CREATE UNIQUE INDEX "Receipt_one_issued_per_payment" ON "Receipt"("paymentId") WHERE status = 'ISSUED';
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_charges_nonneg" CHECK ("additionalChargesKobo" IS NULL OR "additionalChargesKobo" >= 0);
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_discount_nonneg" CHECK ("discountKobo" IS NULL OR "discountKobo" >= 0);
