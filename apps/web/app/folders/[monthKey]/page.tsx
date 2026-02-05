"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CategorySummary, EntryDetail } from "@records/shared";
import { EntryCarousel } from "@/components/EntryCarousel";
import { Lightbox } from "@/components/Lightbox";
import { apiGet } from "@/lib/api";

type EntryWithCategory = EntryDetail & {
  categoryName: string;
};

export default function FolderDetailPage() {
  const params = useParams<{ monthKey: string }>();
  const monthKey = params.monthKey;

  const [entries, setEntries] = useState<EntryWithCategory[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [assetLoadingId, setAssetLoadingId] = useState<string | null>(null);
  const [lightboxAssetId, setLightboxAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const categories = await apiGet<CategorySummary[]>(`/v1/months/${monthKey}/categories`);

      const loaded = await Promise.all(
        categories.map(async (category) => {
          const categoryEntries = await apiGet<EntryDetail[]>(`/v1/categories/${category.id}/entries`);
          return categoryEntries.map((entry) => ({ ...entry, categoryName: category.name }));
        })
      );

      const allEntries = loaded.flat().sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setEntries(allEntries);
      const nextUrls: Record<string, string> = {};
      allEntries.flatMap((entry) => entry.assets).forEach((asset) => {
        if (asset.previewUrl) nextUrls[asset.id] = asset.previewUrl;
      });
      setAssetUrls((prev) => ({ ...nextUrls, ...prev }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folder entries");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function ensureAssetUrl(assetId: string) {
    if (assetUrls[assetId]) return;
    setAssetLoadingId(assetId);
    try {
      const response = await apiGet<{ downloadUrl: string }>(`/v1/assets/${assetId}/download-url`);
      setAssetUrls((prev) => ({ ...prev, [assetId]: response.downloadUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image URL");
    } finally {
      setAssetLoadingId(null);
    }
  }

  async function downloadOriginal(assetId: string, filename: string) {
    setAssetLoadingId(assetId);
    try {
      const response = await apiGet<{ downloadUrl: string }>(`/v1/assets/${assetId}/download-url`);
      const anchor = document.createElement("a");
      anchor.href = response.downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setAssetUrls((prev) => ({ ...prev, [assetId]: response.downloadUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setAssetLoadingId(null);
    }
  }

  const lightboxSrc = useMemo(() => {
    if (!lightboxAssetId) return undefined;
    return assetUrls[lightboxAssetId];
  }, [assetUrls, lightboxAssetId]);

  const selectedAsset = useMemo(() => {
    return entries.flatMap((entry) => entry.assets).find((asset) => asset.id === lightboxAssetId);
  }, [entries, lightboxAssetId]);

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Folder</p>
          <h1 className="text-3xl font-bold">{monthKey}</h1>
        </div>
        <Link href="/folders" className="btn-secondary">Back to picker</Link>
      </div>

      {loading ? <p className="text-sm">Loading cards...</p> : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <section className="space-y-4">
        {entries.map((entry) => (
          <article key={entry.id} className="panel p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-black/55">{entry.categoryName}</p>
                <h2 className="text-xl font-semibold">{entry.title}</h2>
              </div>
              <p className="text-sm text-black/60">{new Date(entry.entryDate).toLocaleDateString()}</p>
            </div>

            {entry.description ? <p className="mb-3 text-sm text-black/80">{entry.description}</p> : null}
            <p className="mb-2 text-xs uppercase tracking-wide text-black/55">Type: {entry.contentType}</p>
            {entry.contentLink ? (
              <a
                href={entry.contentLink}
                target="_blank"
                rel="noreferrer"
                className="mb-3 inline-block text-sm text-tide underline"
              >
                Open content link
              </a>
            ) : null}

            {entry.assets.length > 0 ? (
              <EntryCarousel
                assets={entry.assets.map((asset) => ({ id: asset.id, filename: asset.filename }))}
                assetUrls={assetUrls}
                loadingAssetId={assetLoadingId}
                onRequestUrl={ensureAssetUrl}
                onDownload={downloadOriginal}
                onOpenLightbox={(assetId) => {
                  if (!assetUrls[assetId]) {
                    void ensureAssetUrl(assetId);
                  }
                  setLightboxAssetId(assetId);
                }}
              />
            ) : (
              <p className="text-sm text-black/60">No images</p>
            )}
          </article>
        ))}
      </section>

      <Lightbox
        open={Boolean(lightboxAssetId)}
        src={lightboxSrc}
        filename={selectedAsset?.filename}
        onClose={() => setLightboxAssetId(null)}
        onDownload={async () => {
          if (!selectedAsset) return;
          await downloadOriginal(selectedAsset.id, selectedAsset.filename);
        }}
      />
    </main>
  );
}
