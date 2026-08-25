export interface ResizeImageOptions {
  maxWidth?: number;
  quality?: number;
}

export interface ResizeResult {
  file: File;
  width: number;
  height: number;
}

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_QUALITY = 0.8;

export async function resizeImageFile(
  file: File,
  options: ResizeImageOptions = {},
): Promise<ResizeResult> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;

  if (file.type === 'image/gif') {
    // ponytail: canvas would drop animation — passthrough (dims unknown, 0/0)
    return { file, width: 0, height: 0 };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // ponytail: undecodable (avif edge cases) — upload original rather than fail the import
    return { file, width: 0, height: 0 };
  }

  try {
    const srcWidth = bitmap.width;
    const srcHeight = bitmap.height;
    if (srcWidth <= maxWidth) {
      return { file, width: srcWidth, height: srcHeight };
    }

    const targetWidth = maxWidth;
    const targetHeight = Math.round((srcHeight * maxWidth) / srcWidth);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file, width: srcWidth, height: srcHeight };
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', options.quality ?? DEFAULT_QUALITY),
    );
    if (!blob) {
      return { file, width: srcWidth, height: srcHeight };
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const resized = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
    return { file: resized, width: targetWidth, height: targetHeight };
  } finally {
    bitmap.close?.();
  }
}
