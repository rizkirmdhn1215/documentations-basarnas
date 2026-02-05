export type MonthSummary = {
  monthKey: string;
  categoryCount: number;
  entryCount: number;
};

export type CategorySummary = {
  id: string;
  name: string;
  monthKey: string;
  entryCount: number;
  createdAt: string;
};

export type AssetInfo = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  s3KeyOriginal: string;
  s3KeyPreview: string | null;
  originalUrl: string;
  previewUrl: string | null;
  createdAt: string;
};

export type EntryDetail = {
  id: string;
  contentType: string;
  contentLink: string | null;
  title: string;
  description: string | null;
  entryDate: string;
  tags: string[];
  createdAt: string;
  assets: AssetInfo[];
};
