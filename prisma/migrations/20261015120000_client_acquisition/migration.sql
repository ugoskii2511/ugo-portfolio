-- CreateEnum
CREATE TYPE "ProspectStage" AS ENUM ('DISCOVERED', 'NEEDS_REVIEW', 'QUALIFIED', 'READY_FOR_OUTREACH', 'CONTACTED', 'REPLIED', 'CONSULTATION_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('UNCHECKED', 'VERIFIED', 'FOUND_UNVERIFIED', 'NONE_FOUND', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT,
    "industry" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "website" TEXT,
    "websiteDomain" TEXT,
    "websiteStatus" "WebsiteStatus" NOT NULL DEFAULT 'UNCHECKED',
    "websiteCheckedAt" TIMESTAMP(3),
    "websiteEvidence" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "sourceUrl" TEXT,
    "sourceLicense" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveryJobId" TEXT,
    "stage" "ProspectStage" NOT NULL DEFAULT 'DISCOVERED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "scoreBreakdown" JSONB,
    "scoreOverride" INTEGER,
    "qualification" TEXT,
    "recommendedService" TEXT,
    "nextAction" TEXT,
    "scoredAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "proposalAmount" INTEGER,
    "wonAmount" INTEGER,
    "outcomeReason" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectAudit" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "responseMs" INTEGER,
    "pageBytes" INTEGER,
    "findings" JSONB NOT NULL,
    "pagespeed" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectNote" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectEvent" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT,
    "summary" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachDraft" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "facts" JSONB,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "params" JSONB NOT NULL,
    "state" JSONB,
    "total" INTEGER,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "error" TEXT,
    "log" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ProspectJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suppression" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectorSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectorSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "provider" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("provider","day")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prospect_websiteDomain_idx" ON "Prospect"("websiteDomain");

-- CreateIndex
CREATE INDEX "Prospect_normalizedName_city_idx" ON "Prospect"("normalizedName", "city");

-- CreateIndex
CREATE INDEX "Prospect_stage_idx" ON "Prospect"("stage");

-- CreateIndex
CREATE INDEX "Prospect_score_idx" ON "Prospect"("score");

-- CreateIndex
CREATE INDEX "Prospect_followUpAt_idx" ON "Prospect"("followUpAt");

-- CreateIndex
CREATE INDEX "Prospect_discoveredAt_idx" ON "Prospect"("discoveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_source_sourceRef_key" ON "Prospect"("source", "sourceRef");

-- CreateIndex
CREATE INDEX "ProspectAudit_prospectId_createdAt_idx" ON "ProspectAudit"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectNote_prospectId_createdAt_idx" ON "ProspectNote"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectEvent_prospectId_createdAt_idx" ON "ProspectEvent"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectEvent_type_createdAt_idx" ON "ProspectEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachDraft_status_createdAt_idx" ON "OutreachDraft"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachDraft_prospectId_idx" ON "OutreachDraft"("prospectId");

-- CreateIndex
CREATE INDEX "FollowUpTask_status_dueAt_idx" ON "FollowUpTask"("status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_prospectId_idx" ON "FollowUpTask"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectJob_idempotencyKey_key" ON "ProspectJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProspectJob_status_createdAt_idx" ON "ProspectJob"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Suppression_kind_value_key" ON "Suppression"("kind", "value");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ProspectAudit" ADD CONSTRAINT "ProspectAudit_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectNote" ADD CONSTRAINT "ProspectNote_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectEvent" ADD CONSTRAINT "ProspectEvent_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
