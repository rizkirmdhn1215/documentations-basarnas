-- CreateTable
CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "entryDate" TIMESTAMP(3) NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "entryId" TEXT,
  "s3KeyOriginal" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_monthKey_idx" ON "Category"("monthKey");
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");
CREATE INDEX "Entry_categoryId_idx" ON "Entry"("categoryId");
CREATE INDEX "Entry_monthKey_idx" ON "Entry"("monthKey");
CREATE INDEX "Entry_createdAt_idx" ON "Entry"("createdAt");
CREATE UNIQUE INDEX "Asset_s3KeyOriginal_key" ON "Asset"("s3KeyOriginal");
CREATE INDEX "Asset_entryId_idx" ON "Asset"("entryId");
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
