// ponytail: minimal env read; validation happens at the call site (apiClient/http.ts throw on missing gateway)
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  NEXT_PUBLIC_GATEWAY_URL_PRODUCTION: process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || '',
};
