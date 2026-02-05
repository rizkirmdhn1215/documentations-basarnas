"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Asset = {
  id: string;
  filename: string;
};

type Props = {
  assets: Asset[];
  assetUrls: Record<string, string>;
  loadingAssetId: string | null;
  onRequestUrl: (assetId: string) => Promise<void>;
  onDownload: (assetId: string, filename: string) => Promise<void>;
  onOpenLightbox: (assetId: string) => void;
};

export function EntryCarousel({
  assets,
  assetUrls,
  loadingAssetId,
  onRequestUrl,
  onDownload,
  onOpenLightbox,
}: Props) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const safeIndex = assets.length ? Math.min(index, assets.length - 1) : 0;
  const current = useMemo(() => assets[safeIndex], [assets, safeIndex]);

  const hasPrev = index > 0;
  const hasNext = index < assets.length - 1;

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const endX = event.changedTouches[0]?.clientX;
    if (touchStartX == null || endX == null) return;
    const diff = touchStartX - endX;
    if (diff > 40 && hasNext) setIndex((value) => value + 1);
    if (diff < -40 && hasPrev) setIndex((value) => value - 1);
    setTouchStartX(null);
  }

  useEffect(() => {
    if (paused || assets.length < 2) return;
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % assets.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [assets.length, paused]);

  if (!assets.length || !current) return null;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-2">
      <div
        className="relative aspect-video overflow-hidden rounded-lg bg-black/5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {!assetUrls[current.id] ? (
          <div className="flex h-full items-center justify-center text-sm text-black/60">
            <button className="btn-secondary" onClick={() => onRequestUrl(current.id)}>
              Load preview
            </button>
          </div>
        ) : (
          <button className="block h-full w-full" onClick={() => onOpenLightbox(current.id)}>
            <Image
              src={assetUrls[current.id]}
              alt={current.filename}
              fill
              unoptimized
              className="object-cover"
            />
          </button>
        )}

        <button
          className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
          onClick={() => onDownload(current.id, current.filename)}
          disabled={loadingAssetId === current.id}
          title="Download original"
        >
          {loadingAssetId === current.id ? "..." : "Download"}
        </button>

        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-sm text-white disabled:opacity-40"
          disabled={!hasPrev}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          Left
        </button>
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-sm text-white disabled:opacity-40"
          disabled={!hasNext}
          onClick={() => setIndex((value) => Math.min(assets.length - 1, value + 1))}
        >
          Right
        </button>
      </div>

      <p className="mt-2 text-xs text-black/70">
        {safeIndex + 1}/{assets.length} - {current.filename} {paused ? "(paused)" : "(auto)"}
      </p>
    </div>
  );
}
