ALTER TABLE "Entry"
ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "contentLink" TEXT;

ALTER TABLE "Asset"
ADD COLUMN "s3KeyPreview" TEXT,
ADD COLUMN "originalUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "previewUrl" TEXT;

CREATE INDEX "Entry_contentType_idx" ON "Entry"("contentType");
