import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

if (typeof window !== 'undefined') {
  // requestAnimationFrame polyfill
  let _rafId = 0;
  window.requestAnimationFrame = (callback) => {
    const id = ++_rafId;
    setTimeout(() => callback(performance.now()), 16);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };

  // matchMedia polyfill for Ant Design responsive layout
  window.matchMedia =
    window.matchMedia ||
    function (query: string) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };

  // ResizeObserver polyfill for Ant Design Table / VirtualList
  if (typeof (window as any).ResizeObserver === 'undefined') {
    (window as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
