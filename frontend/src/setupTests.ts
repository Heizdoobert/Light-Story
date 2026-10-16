// Global test setup for happy-dom and vitest
if (typeof window !== 'undefined') {
  let _rafId = 0;
  window.requestAnimationFrame = (callback) => {
    const id = ++_rafId;
    setTimeout(() => callback(performance.now()), 16);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Polyfill DOMException if missing
if (typeof globalThis.DOMException === 'undefined') {
  class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'Error';
    }
  }
  // @ts-ignore
  globalThis.DOMException = DOMException;
}

import '@testing-library/jest-dom';

// Polyfill File for FormData handling (provide _buffer and arrayBuffer)
if (typeof (global as any).File === 'undefined') {
  const { Buffer } = require('buffer');
  // @ts-ignore
  class TestFile extends Blob {
    name: string;
    lastModified: number;
    type: string;
    // @ts-ignore
    _buffer: Buffer;
    constructor(chunks: BlobPart[], filename: string, options: FilePropertyBag = {}) {
      super(chunks, options);
      this.name = filename;
      this.lastModified = options.lastModified ?? Date.now();
      this.type = options.type ?? '';
      const firstChunk = chunks[0];
      // @ts-ignore
      this._buffer = Buffer.isBuffer(firstChunk)
        ? firstChunk
        : Buffer.from(typeof firstChunk === 'string' ? firstChunk : '');
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
      // @ts-ignore
      return this._buffer.buffer;
    }
  }
  // @ts-ignore
  (global as any).File = TestFile;
}

// Mock framer-motion to no-op animations in test environment
import React from 'react';
import { vi } from 'vitest';
const MOTION_PROPS = new Set([
  'whileTap', 'whileHover', 'whileFocus', 'whileDrag', 'whileInView',
  'initial', 'animate', 'exit', 'transition', 'variants', 'layout', 'layoutId',
]);
const stripMotionProps = (props: Record<string, any>) => {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(props)) {
    if (!MOTION_PROPS.has(key)) clean[key] = val;
  }
  return clean;
};

const framerCache = new Map<string, React.FC<any>>();
vi.mock('framer-motion', () => {
  const getMotionComponent = (tag: string) => {
    if (!framerCache.has(tag)) {
      framerCache.set(tag, (props: any) => {
        const { children, ...rest } = props;
        return React.createElement(tag, stripMotionProps(rest), children);
      });
    }
    return framerCache.get(tag)!;
  };
  const motionProxy = new Proxy({} as any, {
    get: (_, prop: string) => getMotionComponent(prop),
  });
  return {
    __esModule: true,
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({ start: async () => {}, stop: () => {} }),
    // Fallback for any other named export
    ...new Proxy({}, { get: () => () => null }),
  };
});

// Additional mock for 'motion/react' to no-op animations
const motionReactCache = new Map<string, React.FC<any>>();
vi.mock('motion/react', () => {
  const getMotionComponent = (tag: string) => {
    if (!motionReactCache.has(tag)) {
      motionReactCache.set(tag, (props: any) => {
        const { children, ...rest } = props;
        return React.createElement(tag, stripMotionProps(rest), children);
      });
    }
    return motionReactCache.get(tag)!;
  };
  const motionProxy = new Proxy({} as any, {
    get: (_, prop: string) => getMotionComponent(prop),
  });
  return {
    __esModule: true,
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => children ?? null,
    useAnimation: () => ({ start: async () => {}, stop: () => {} }),
    // Fallback for any other named export
    ...new Proxy({}, { get: () => () => null }),
  };
});
// Mock lucide-react icons using importOriginal so all icon exports are valid components
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
  };
});

// Mock next/link to a basic anchor element
vi.mock('next/link', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('a', props, props.children),
}));

// Ensure React portals render inline during tests
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children,
  };
});
