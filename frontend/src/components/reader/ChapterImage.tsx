"use client";

import React, { useState } from 'react';
import { ImageOff, RefreshCw } from 'lucide-react';

type ChapterImageProps = {
  src: string;
  alt: string;
  index: number;
  className?: string;
};

export const ChapterImage: React.FC<ChapterImageProps> = ({ src, alt, index, className = '' }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imgKey, setImgKey] = useState(src);

  const handleRetry = () => {
    setError(false);
    setLoaded(false);
    setRetryCount((prev) => prev + 1);
    setImgKey(`${src}?retry=${retryCount + 1}`);
  };

  return (
    <div className={`relative min-h-[300px] w-full flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/40 rounded-xl overflow-hidden my-2 ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-800/60 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-400">Đang tải trang {index + 1}...</span>
        </div>
      )}

      {error ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <ImageOff className="w-8 h-8 text-rose-400" />
          <p className="text-xs">Không thể tải trang {index + 1}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Thử lại
          </button>
        </div>
      ) : (
        <img
          key={imgKey}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};
