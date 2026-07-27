/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
      [key: string]: string | undefined;
    }
  }

  // Explicitly declare process for environments where @types/node isn't resolved locally
  var process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};
