"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, RefreshCw } from 'lucide-react';
import Image from 'next/image';

type ChapterImageProps = {
  src: string;
  alt: string;
  index: number;
  className?: string;
  fitScreen?: boolean;
  priority?: boolean;
};

const MAX_AUTO_RETRIES = 3;

export const ChapterImage: React.FC<ChapterImageProps> = ({ src, alt, index, className = '', fitScreen, priority = false }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(priority);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [imgKey, setImgKey] = useState(src);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (priority) {
      setVisible(true);
      return;
    }
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    let observer: IntersectionObserver | null = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && isMountedRef.current) {
          setVisible(true);
          observer?.disconnect();
          observer = null;
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
  }, [priority]);

  const handleError = () => {
    if (!isMountedRef.current) return;
    if (autoRetryCount < MAX_AUTO_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, autoRetryCount), 4000) + Math.random() * 200;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      retryTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setAutoRetryCount((prev) => prev + 1);
        const separator = src.includes('?') ? '&' : '?';
        setImgKey(`${src}${separator}retry=${Date.now()}`);
      }, delay);
    } else {
      setError(true);
    }
  };

  const handleRetry = () => {
    if (!isMountedRef.current) return;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setAutoRetryCount(0);
    setError(false);
    setLoaded(false);
    const separator = src.includes('?') ? '&' : '?';
    setImgKey(`${src}${separator}retry=${Date.now()}`);
  };

  return (
    <div
      ref={containerRef}
      data-testid="chapter-image-container"
      style={fitScreen ? undefined : { aspectRatio: '3/4' }}
      className={`relative w-full flex items-center justify-center overflow-hidden my-2 ${fitScreen ? 'max-h-screen bg-transparent' : 'aspect-[3/4] rounded-xl bg-slate-900/10 dark:bg-slate-950/40'} ${className}`}
    >
      {!visible && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800/60 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-400">&nbsp;</span>
        </div>
      )}

      {visible && !loaded && !error && (
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
        visible && (
          <Image
            key={imgKey}
            src={imgKey}
            alt={alt}
            priority={priority}
            fill
            onLoad={() => {
              if (isMountedRef.current) setLoaded(true);
            }}
            onLoadingComplete={() => {
              if (isMountedRef.current) setLoaded(true);
            }}
            onError={handleError}
            className={`transition-opacity duration-300 ${
              fitScreen
                ? 'w-auto h-full max-w-full object-contain'
                : 'h-full w-full object-contain'
            } ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )
      )}
    </div>
  );
};
