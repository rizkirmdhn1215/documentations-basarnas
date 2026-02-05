"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EntryDetail } from "@records/shared";
import { apiGet, apiSend, uploadToPresignedUrl } from "@/lib/api";
import { EntryCarousel } from "@/components/EntryCarousel";
import { Lightbox } from "@/components/Lightbox";

type UploadResponse = {
  id: string;
  key: string;
  putUrl: string;
  publicUrl: string;
  previewKey: string;
  previewPutUrl: string;
  previewUrl: string;
};

async function generatePreviewBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 960;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Preview generation failed");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Preview generation failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.78
    );
  });
}

function todayDateInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CategoryDetailPage() {
  const params = useParams<{ categoryId: string }>();
  const categoryId = params.categoryId;
  const [entries, setEntries] = useState<EntryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [assetLoadingId, setAssetLoadingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("general");
  const [contentLink, setContentLink] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(todayDateInput());
  const [tagsRaw, setTagsRaw] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ file: File; url: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [lightboxAssetId, setLightboxAssetId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setError("");
      const data = await apiGet<EntryDetail[]>(`/v1/categories/${categoryId}/entries`);
      setEntries(data);
      const nextUrls: Record<string, string> = {};
      data.flatMap((entry) => entry.assets).forEach((asset) => {
        if (asset.previewUrl) nextUrls[asset.id] = asset.previewUrl;
      });
      setAssetUrls((prev) => ({ ...nextUrls, ...prev }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    return () => {
      for (const preview of filePreviews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [filePreviews]);

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
    try {
      setAssetLoadingId(assetId);
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

  function onFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const nextFiles = Array.from(fileList);
    setFiles(nextFiles);
    const previews = nextFiles.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFilePreviews(previews);
  }

  async function createEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const uploadedAssetIds: string[] = [];

      for (const file of files) {
        const uploadInfo = await apiSend<UploadResponse>("/v1/assets/upload-url", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
        });

        await uploadToPresignedUrl(uploadInfo.putUrl, file);
        const previewBlob = await generatePreviewBlob(file);
        await uploadToPresignedUrl(
          uploadInfo.previewPutUrl,
          new File([previewBlob], `${file.name}-preview.jpg`, { type: "image/jpeg" })
        );
        uploadedAssetIds.push(uploadInfo.id);
      }

      const tags = tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      await apiSend(`/v1/categories/${categoryId}/entries`, {
        method: "POST",
        body: JSON.stringify({
          contentType,
          contentLink: contentLink.trim() || null,
          title: title.trim(),
          description: description.trim() || null,
          entryDate,
          tags,
          assetIds: uploadedAssetIds,
        }),
      });

      setTitle("");
      setContentType("general");
      setContentLink("");
      setDescription("");
      setTagsRaw("");
      setEntryDate(todayDateInput());
      for (const preview of filePreviews) {
        URL.revokeObjectURL(preview.url);
      }
      setFiles([]);
      setFilePreviews([]);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create entry failed");
    } finally {
      setSubmitting(false);
    }
  }

  const lightboxSrc = useMemo(() => {
    if (!lightboxAssetId) return undefined;
    return assetUrls[lightboxAssetId];
  }, [assetUrls, lightboxAssetId]);

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <Link href="/" className="mb-5 inline-flex text-sm text-black/70 hover:text-ink">
        Back to months
      </Link>

      <h1 className="mb-6 text-3xl font-bold">Category Entries</h1>

      <section className="panel mb-8 p-5">
        <h2 className="mb-4 text-lg font-semibold">Create entry</h2>
        <form className="space-y-3" onSubmit={createEntry}>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="input"
              placeholder="Content type (example: note, report, invoice)"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Content link (optional, https://...)"
              value={contentLink}
              onChange={(e) => setContentLink(e.target.value)}
            />
          </div>
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="input min-h-24" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            <input className="input" placeholder="Tags comma separated" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
          </div>
          <input className="input" type="file" accept="image/*" multiple onChange={(e) => onFilesSelected(e.target.files)} />

          {filePreviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {filePreviews.map((preview) => (
                <div key={`${preview.file.name}-${preview.file.size}`} className="panel p-2">
                  <Image
                    src={preview.url}
                    alt={preview.file.name}
                    width={400}
                    height={180}
                    unoptimized
                    className="h-24 w-full rounded object-cover"
                  />
                  <p className="mt-1 truncate text-xs">{preview.file.name}</p>
                </div>
              ))}
            </div>
          ) : null}

          <button className="btn-primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save entry"}
          </button>
        </form>
      </section>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      {loading ? <p className="text-sm">Loading entries...</p> : null}

      <section className="space-y-4">
        {entries.map((entry) => (
          <article key={entry.id} className="panel p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">{entry.title}</h3>
              <p className="text-sm text-black/60">{new Date(entry.entryDate).toLocaleDateString()}</p>
            </div>
            <p className="mb-1 text-xs uppercase tracking-wide text-black/55">Type: {entry.contentType}</p>
            {entry.contentLink ? (
              <a
                href={entry.contentLink}
                target="_blank"
                rel="noreferrer"
                className="mb-2 inline-block text-sm text-tide underline"
              >
                Open content link
              </a>
            ) : null}
            {entry.description ? <p className="mb-3 text-sm text-black/80">{entry.description}</p> : null}
            {entry.tags.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-amber/20 px-2 py-1 text-xs">#{tag}</span>
                ))}
              </div>
            ) : null}

            {entry.assets.length ? (
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
              <p className="text-sm text-black/60">No images attached.</p>
            )}
          </article>
        ))}
      </section>

      <Lightbox
        open={Boolean(lightboxAssetId)}
        src={lightboxSrc}
        filename={entries
          .flatMap((entry) => entry.assets)
          .find((asset) => asset.id === lightboxAssetId)?.filename}
        onClose={() => setLightboxAssetId(null)}
        onDownload={async () => {
          const asset = entries.flatMap((entry) => entry.assets).find((value) => value.id === lightboxAssetId);
          if (!asset) return;
          await downloadOriginal(asset.id, asset.filename);
        }}
      />
    </main>
  );
}
