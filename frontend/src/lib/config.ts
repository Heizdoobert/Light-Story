// src/lib/config.ts
import { z } from 'zod';

/**
 * Centralized environment configuration.
 * Values are validated at import time and exported as a typed object.
 *
 * - PAGE_SIZE: default pagination page size (default 20). Can be overridden via env var.
 * - JWT_SECRET: secret for custom JWT verification (optional; required only if JWT auth is used).
 */
const envSchema = z.object({
  PAGE_SIZE: z.coerce.number().int().positive().default(20),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),
});

export const config = envSchema.parse(process.env);
