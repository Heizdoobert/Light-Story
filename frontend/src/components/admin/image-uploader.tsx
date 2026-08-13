"use client";

import React, { useRef, useState } from "react";
import { Upload, X, FileArchive, CheckCircle2 } from "lucide-react";
import { uploadToR2 } from "@/lib/r2/upload";
import { processCbzFile } from "@/lib/r2/cbz-processor";
import { getR2ImageUrl } from "@/lib/utils/image-url";
import { cbzBasename, isCbzOrZipFile } from "@/lib/r2/cbz-name";
import { toast } from "sonner";

export interface ImageUploaderProps {
  onImagesUploaded?: (urls: string[]) => void;
  onCbzName?: (name: string) => void;
  onCbzProcessed?: (name: string, urls: string[]) => void;
  bulkChapters?: boolean;
  folder?: string;
}

export function ImageUploader({
  onImagesUploaded,
  onCbzName,
  onCbzProcessed,
  bulkChapters = false,
  folder = "chapters",
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    if (isUploading) return;
    const list = Array.from(files);
    if (list.length === 0) return;

    setIsUploading(true);
    setProgressMsg("");
    const uploadedUrls: string[] = [];

    const handleCbz = async (file: File) => {
      const name = cbzBasename(file.name);
      if (name) onCbzName?.(name);
      toast.info(`Đang giải nén tập tin comic ${file.name}...`);
      const cbzRes = await processCbzFile(file, folder, (_curr, _tot, msg) => {
        setProgressMsg(msg);
      });

      if (cbzRes.success && cbzRes.urls.length > 0 && cbzRes.failed === 0) {
        if (bulkChapters) {
          onCbzProcessed?.(name, cbzRes.urls);
        } else {
          uploadedUrls.push(...cbzRes.urls);
        }
        toast.success(`Đã tải lên ${cbzRes.urls.length} trang ảnh từ tệp ${file.name}!`);
      } else if (cbzRes.failed > 0) {
        toast.error(`Không thể tải hết trang ảnh từ ${file.name}: ${cbzRes.error || `${cbzRes.failed} trang thất bại`}. Chương không được tạo.`);
      } else {
        toast.error(cbzRes.error || `Không thể giải nén tệp ${file.name}`);
      }
    };

    const handleImage = async (file: File, i: number, total: number) => {
      setProgressMsg(`Đang tải lên ảnh ${i}/${total}...`);
      const res = await uploadToR2(file, folder);
      if (res.success && res.url) {
        uploadedUrls.push(res.url);
      } else {
        toast.error(`Tải lên ảnh ${file.name} thất bại`);
      }
    };

    const cbzList = list.filter(isCbzOrZipFile);
    const imageList = list.filter((f) => !isCbzOrZipFile(f));

    if (bulkChapters) {
      cbzList.sort((a, b) => a.name.localeCompare(b.name));
      let next = 0;
      const workers = Array.from({ length: Math.min(3, cbzList.length) }, async () => {
        while (next < cbzList.length) {
          const file = cbzList[next++];
          await handleCbz(file);
        }
      });
      await Promise.all(workers);
    } else {
      let imgIdx = 0;
      for (const file of [...cbzList, ...imageList]) {
        if (isCbzOrZipFile(file)) {
          await handleCbz(file);
        } else {
          imgIdx += 1;
          await handleImage(file, imgIdx, imageList.length);
        }
      }
    }

    setIsUploading(false);
    setProgressMsg("");
    if (inputRef.current) inputRef.current.value = "";
    if (uploadedUrls.length > 0) {
      setPreviews((prev) => [...prev, ...uploadedUrls]);
      onImagesUploaded?.(uploadedUrls);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void processFiles(e.target.files ?? []);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    void processFiles(e.dataTransfer.files);
  };

  const removePreview = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer group ${
          isDragging
            ? "border-orange-500 bg-orange-500/10"
            : "border-slate-300 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Upload size={32} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
          <FileArchive size={32} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center">
          Kéo thả ảnh hoặc chọn tệp truyện <strong>.CBZ / .ZIP / Hình Ảnh</strong>
        </span>
        <span className="text-xs text-slate-400 mt-1 text-center">
          Hỗ trợ tải lên bộ tệp truyện <strong>.cbz</strong> (tự động giải nén & sắp xếp thứ tự trang lên R2 Storage)
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.cbz,.zip,application/x-cbz,application/zip,application/x-zip-compressed"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {isUploading && (
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-3 text-xs font-semibold text-orange-500 animate-pulse">
          <FileArchive size={20} className="shrink-0" />
          <span>{progressMsg || "Đang xử lý & tải lên hạ tầng R2..."}</span>
        </div>
      )}

      {previews.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle2 size={14} /> Đã tải lên {previews.length} trang ảnh chương
            </span>
            <button
              type="button"
              onClick={() => setPreviews([])}
              className="text-rose-500 hover:underline"
            >
              Xóa tất cả
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-80 overflow-y-auto p-2 bg-slate-950/40 rounded-xl border border-slate-800">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                <img src={getR2ImageUrl(src)} alt={`Trang ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 text-[10px] font-bold text-white rounded">
                  P.{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePreview(i)}
                  className="absolute top-1 right-1 p-1 bg-black/80 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Xóa trang này"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
