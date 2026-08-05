// ponytail: minimal zod env validation, fallbacks prevent build breakage
import { z } from 'zod';

const server = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const client = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_GATEWAY_URL_PRODUCTION: z.string().optional(),
});

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  NEXT_PUBLIC_GATEWAY_URL_PRODUCTION: process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || 'https://kv-worker.hhhuygiau.workers.dev',
};
