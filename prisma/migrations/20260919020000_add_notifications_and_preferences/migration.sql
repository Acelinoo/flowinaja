-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_PENDING', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REVISION_REQUESTED', 'REQUEST_PROCESSING', 'REQUEST_COMPLETED', 'REQUEST_CANCELLED');

-- DropIndex
DROP INDEX "notifications_organizationId_idx";

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "cycle" INTEGER,
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "stepOrder" INTEGER,
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'APPROVAL_PENDING';

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "approvalPending" BOOLEAN NOT NULL DEFAULT true,
    "requestUpdates" BOOLEAN NOT NULL DEFAULT true,
    "processingUpdates" BOOLEAN NOT NULL DEFAULT true,
    "completionUpdates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_organizationId_idx" ON "notification_preferences"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON "notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "notifications_organizationId_recipientId_isRead_idx" ON "notifications"("organizationId", "recipientId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_organizationId_createdAt_idx" ON "notifications"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
