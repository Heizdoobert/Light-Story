"use client";

import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadToR2 } from '@/lib/r2/upload';

export interface ImageUploaderProps {
  onImagesUploaded?: (urls: string[]) => void;
  folder?: string;
}

export function ImageUploader({ onImagesUploaded, folder = 'chapters' }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const res = await uploadToR2(files[i], folder);
      if (res.success && res.url) {
        uploadedUrls.push(res.url);
      }
    }

    setIsUploading(false);
    setPreviews((prev) => [...prev, ...uploadedUrls]);
    onImagesUploaded?.(uploadedUrls);
  };

  const removePreview = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
        <Upload size={32} className="text-slate-400 mb-2" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Kéo thả ảnh hoặc nhấp để chọn tệp
        </span>
        <span className="text-xs text-slate-400 mt-1">Hỗ trợ PNG, JPG, WEBP</span>
        <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>

      {isUploading && <p className="text-xs font-semibold text-orange-500 animate-pulse">Đang tải lên ảnh...</p>}

      {previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src={src} alt={`Preview ${i}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePreview(i)}
                className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-red-600"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
