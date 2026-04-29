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

    const injectionFn = () => {
      if (!adRef.current) return;

      try {
        adRef.current.innerHTML = '';

        const range = document.createRange();
        const documentFragment = range.createContextualFragment(script);

        adRef.current.appendChild(documentFragment);
        injectedRef.current = true;
      } catch (error) {
        console.error('Failed to render ad:', error);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(injectionFn, { timeout: 2000 });
    } else {
      setTimeout(injectionFn, 0);
    }

    return () => {
      injectedRef.current = false;
    };
  }, [script]);

  if (!script) return null;

  return <div ref={adRef} className={`ad-container overflow-hidden flex justify-center items-center ${className}`} />;
};
