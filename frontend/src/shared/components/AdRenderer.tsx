// Optimized ad renderer with deferred injection to avoid blocking main thread
import React, { useEffect, useRef } from 'react';

interface AdRendererProps {
  script: string;
  className?: string;
}

export const AdRenderer: React.FC<AdRendererProps> = ({ script, className }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!adRef.current || !script || injectedRef.current) {
      return;
    }

    // Defer ad injection to avoid blocking main thread
    // Use requestIdleCallback if available (modern browsers), fallback to setTimeout
    const injectionFn = () => {
      if (!adRef.current) return;

      try {
        // Clear previous content
        adRef.current.innerHTML = '';

        // Parse ad script safely
        const range = document.createRange();
        const documentFragment = range.createContextualFragment(script);

        // Append to the ref (now deferred, so less likely to block main thread)
        adRef.current.appendChild(documentFragment);
        injectedRef.current = true;
      } catch (error) {
        console.error('Failed to render ad:', error);
      }
    };

    // Use requestIdleCallback for better performance, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(injectionFn, { timeout: 2000 });
    } else {
      // Fallback: defer with setTimeout to give browser a chance to render
      setTimeout(injectionFn, 0);
    }

    // Cleanup function
    return () => {
      injectedRef.current = false;
    };
  }, [script]);

  if (!script) return null;

  return (
    <div
      ref={adRef}
      className={`ad-container overflow-hidden flex justify-center items-center ${className}`}
    />
  );
};

