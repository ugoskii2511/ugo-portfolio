-- CreateEnum
CREATE TYPE "ClientProjectStatus" AS ENUM ('INQUIRY', 'QUOTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClientPaymentKind" AS ENUM ('PROJECT', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "notes" TEXT,
    "prospectId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "serviceType" TEXT,
    "description" TEXT,
    "priceKobo" BIGINT,
    "status" "ClientProjectStatus" NOT NULL DEFAULT 'INQUIRY',
    "startDate" DATE,
    "expectedDeliveryDate" DATE,
    "completedDate" DATE,
    "maintenanceFeeKobo" BIGINT,
    "maintenanceInterval" TEXT,
    "nextPaymentDate" DATE,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" "ClientPaymentKind" NOT NULL DEFAULT 'PROJECT',
    "amountKobo" BIGINT NOT NULL,
    "paidOn" DATE NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "clientRequestId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "category" TEXT NOT NULL,
    "spentOn" DATE NOT NULL,
    "notes" TEXT,
    "method" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "receiptPath" TEXT,
    "clientRequestId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_deletedAt_createdAt_idx" ON "Client"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "ClientProject_clientId_idx" ON "ClientProject"("clientId");

-- CreateIndex
CREATE INDEX "ClientProject_status_deletedAt_idx" ON "ClientProject"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "ClientProject_createdAt_idx" ON "ClientProject"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayment_clientRequestId_key" ON "ClientPayment"("clientRequestId");

-- CreateIndex
CREATE INDEX "ClientPayment_paidOn_deletedAt_idx" ON "ClientPayment"("paidOn", "deletedAt");

-- CreateIndex
CREATE INDEX "ClientPayment_clientId_idx" ON "ClientPayment"("clientId");

-- CreateIndex
CREATE INDEX "ClientPayment_projectId_idx" ON "ClientPayment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_clientRequestId_key" ON "Expense"("clientRequestId");

-- CreateIndex
CREATE INDEX "Expense_spentOn_deletedAt_idx" ON "Expense"("spentOn", "deletedAt");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_projectId_idx" ON "Expense"("projectId");

-- AddForeignKey
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Money can never be negative (and payments/expenses never zero), enforced
-- by the database as well as the app.
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_price_nonneg" CHECK ("priceKobo" IS NULL OR "priceKobo" >= 0);
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_fee_nonneg" CHECK ("maintenanceFeeKobo" IS NULL OR "maintenanceFeeKobo" >= 0);
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_amount_positive" CHECK ("amountKobo" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_positive" CHECK ("amountKobo" > 0);
