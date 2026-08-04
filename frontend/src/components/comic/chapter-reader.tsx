"use client";

import { getR2ImageUrl } from '@/lib/utils/image-url';

export interface ChapterReaderProps {
  images: string[];
}

export function ChapterReader({ images }: ChapterReaderProps) {
  if (!images || images.length === 0) {
    return <p className="text-center text-slate-500 py-12">Không có ảnh chương.</p>;
  }

  return (
    <div className="flex flex-col items-center space-y-2 max-w-3xl mx-auto">
      {images.map((img, idx) => (
        <img
          key={idx}
          src={getR2ImageUrl(img)}
          alt={`Page ${idx + 1}`}
          className="w-full object-contain rounded-lg shadow-md"
          loading="lazy"
        />
      ))}
    </div>
  );
}

export default ChapterReader;
