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
vi.mock('framer-motion', () => {
  // Create components that render the native HTML tag with all received props
  const createMotionComponent = (tag: any) => {
    return (props: any) => {
      const { children, ...rest } = props;
      return React.createElement(tag, rest, children);
    };
  };
  const motionProxy = new Proxy({} as any, {
    get: (_, prop) => createMotionComponent(prop),
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
vi.mock('motion/react', () => {
  // Render native HTML tags for motion components
  const createMotionComponent = (tag: any) => {
    return (props: any) => {
      const { children, ...rest } = props;
      return React.createElement(tag, rest, children);
    };
  };
  const motionProxy = new Proxy({} as any, {
    get: (_, prop) => createMotionComponent(prop),
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
// Mock lucide-react icons to simple SVG placeholders
vi.mock('lucide-react', () => {
  // Provide a generic SVG placeholder with data-icon and merged className for any icon.
  const createIcon = (name: string) => (props: any) => {
      const { className = '', ...rest } = props;
      const defaultClass = `lucide-${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
      const mergedClass = [defaultClass, className].filter(Boolean).join(' ');
      return React.createElement('svg', {
        'data-icon': name,
        className: mergedClass,
        ...rest,
      });
    };

    // Explicitly export commonly used icons to satisfy tests, including previously missing ones.
    const explicitIcons = [
      'Flame',
      'Search',
      'SlidersHorizontal',
      'Construction',
      'LayoutDashboard',
      'LogIn',
      'LogOut',
      'User',
      'ArrowUpDown',
      'Eye',
      'X',
      'SearchX',
      'Menu',
      'ChevronsLeft',
      'ChevronDown',
      'Play',
    ];

    const exports: Record<string, any> = {};
    explicitIcons.forEach((icon) => {
      exports[icon] = createIcon(icon);
    });

    // Fallback proxy for any other icon name.
    const genericProxy = new Proxy({} as any, {
      get: (_, name) => createIcon(name as string),
    });

    return { __esModule: true, ...exports, ...genericProxy };
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
