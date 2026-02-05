"use client";

import Image from "next/image";

type Props = {
  open: boolean;
  src?: string;
  filename?: string;
  onClose: () => void;
  onDownload: () => void;
};

export function Lightbox({ open, src, filename, onClose, onDownload }: Props) {
  if (!open || !src) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <button className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm" onClick={onClose}>
        Close
      </button>
      <button className="absolute right-24 top-4 rounded-full bg-tide px-3 py-1 text-sm text-white" onClick={onDownload}>
        Download original
      </button>
      <div className="relative h-[78vh] w-full max-w-5xl overflow-hidden rounded-xl bg-black/20">
        <Image src={src} alt={filename || "Asset"} fill unoptimized className="object-contain" />
      </div>
    </div>
  );
}
