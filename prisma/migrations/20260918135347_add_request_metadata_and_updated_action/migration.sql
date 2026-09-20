-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'REQUEST_UPDATED';

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "metadata" JSONB;
