-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'REQUEST_RESUBMITTED';

-- DropIndex
DROP INDEX "approvals_requestId_stepOrder_key";

-- AlterTable
ALTER TABLE "approvals" ADD COLUMN     "cycle" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "currentCycle" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "approvals_requestId_cycle_idx" ON "approvals"("requestId", "cycle");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_requestId_cycle_stepOrder_key" ON "approvals"("requestId", "cycle", "stepOrder");
