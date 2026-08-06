import { z } from "zod";

export const supabaseWebhookSchema = z
  .object({
    type: z.string().optional(),
    event: z.string().optional(),
    table: z.string().optional(),
    schema: z.string().optional(),
    record: z.unknown().optional(),
    old: z.unknown().optional(),
    columns: z.array(z.string()).optional(),
  })
  .passthrough();

export type SupabaseWebhookPayload = z.infer<typeof supabaseWebhookSchema>;