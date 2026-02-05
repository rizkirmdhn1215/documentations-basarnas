-- BASARNAS Media Archive Database Migration
-- Creates the media_items table with dual file storage (preview + original)

CREATE TABLE IF NOT EXISTS media_items (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'image' or 'video'
  mime_type VARCHAR(100) NOT NULL,
  
  -- Preview version (for page display)
  preview_s3_key VARCHAR(500) NOT NULL,
  preview_s3_url TEXT NOT NULL,
  preview_file_size BIGINT,
  
  -- Original version (for download)
  original_s3_key VARCHAR(500) NOT NULL,
  original_s3_url TEXT NOT NULL,
  original_file_size BIGINT,
  
  -- Metadata
  media_date DATE NOT NULL, -- User-specified date (defaults to upload date)
  upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  year INTEGER NOT NULL, -- Extracted from media_date
  month INTEGER NOT NULL, -- Extracted from media_date
  description TEXT,
  tags TEXT[] -- Array of tags for filtering
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_media_year_month ON media_items(year, month);
CREATE INDEX IF NOT EXISTS idx_media_tags ON media_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_date ON media_items(media_date);
