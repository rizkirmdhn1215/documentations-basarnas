-- DropIndex
DROP INDEX "Entry_contentType_idx";

-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "originalUrl" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Entry" ALTER COLUMN "contentType" DROP DEFAULT;
