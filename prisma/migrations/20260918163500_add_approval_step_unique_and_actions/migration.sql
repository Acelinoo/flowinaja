-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'APPROVAL_APPROVED';

-- CreateIndex
CREATE UNIQUE INDEX "approvals_requestId_stepOrder_key" ON "approvals"("requestId", "stepOrder");
