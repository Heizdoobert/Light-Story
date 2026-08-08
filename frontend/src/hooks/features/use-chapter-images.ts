"use client";

import { useState } from "react";
import { getR2ImageUrl } from "@/lib/r2/client";

export function useChapterImages(images: string[]) {
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(
    new Set([0, 1]),
  );

  const formattedImages = images.map((img) => getR2ImageUrl(img));

  const markImageLoaded = (index: number) => {
    setLoadedIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      next.add(index + 1); // prefetch next
      return next;
    });
  };

  return {
    formattedImages,
    loadedIndices,
    markImageLoaded,
  };
}
