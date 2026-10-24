'use client';

import React, { useState, useRef } from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import type Entity from '@ant-design/cssinjs/es/Cache';
import { useServerInsertedHTML } from 'next/navigation';

export interface AntdRegistryProps {
  children: React.ReactNode;
}

/**
 * AntdRegistry extracts critical CSS-in-JS during Next.js App Router SSR
 * preventing Flash of Unstyled Content (FOUC).
 */
export function AntdRegistry({ children }: AntdRegistryProps) {
  const [cache] = useState<Entity>(() => createCache());
  const isServerInserted = useRef<boolean>(false);

  useServerInsertedHTML(() => {
    // Prevent duplicate style tags
    if (isServerInserted.current) {
      return null;
    }
    isServerInserted.current = true;
    return (
      <style
        id="antd-cssinjs"
        dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
      />
    );
  });

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}

export default AntdRegistry;
