declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  interface R2Bucket {
    get(key: string): Promise<any>;
    put(key: string, value: any, options?: any): Promise<any>;
    delete(key: string): Promise<any>;
  }
}

export {};
