import '@testing-library/jest-dom';

// Test setup: rewrite requests targeting http://api to http://localhost:3001
// This helps tests that use the 'api' host to resolve to the local Next dev server.
const globalAny = globalThis as any;
const originalFetch = globalAny.fetch;

if (typeof originalFetch === 'function') {
  globalAny.fetch = async (input: RequestInfo, init?: RequestInit) => {
    try {
      let url: string;
      if (typeof input === 'string') url = input;
      else url = (input as Request).url;

      if (url.startsWith('http://api/')) {
        const newUrl = url.replace('http://api', 'http://localhost:3001');
        if (typeof input === 'string') input = newUrl;
        else input = new Request(newUrl, input as RequestInit);
      }
    } catch (e) {
      // ignore and proceed to original fetch
    }

    return originalFetch.call(globalAny, input, init as any);
  };
}
