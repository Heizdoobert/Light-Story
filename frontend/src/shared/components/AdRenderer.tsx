// This component renders ad scripts fetched from the database
import React, { useEffect, useRef } from 'react';

interface AdRendererProps {
  script: string;
  className?: string;
}

export const AdRenderer: React.FC<AdRendererProps> = ({ script, className }) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adRef.current && script) {
      // Clear previous content
      adRef.current.innerHTML = '';
      
      // Create a range to parse the script string into DOM nodes
      const range = document.createRange();
      const documentFragment = range.createContextualFragment(script);
      
      // Append to the ref
      adRef.current.appendChild(documentFragment);
    }
  }, [script]);

  if (!script) return null;

  return (
    <div 
      ref={adRef} 
      className={`ad-container overflow-hidden flex justify-center items-center ${className}`}
    />
  );
};
