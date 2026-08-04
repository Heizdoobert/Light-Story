import { z } from "zod";

export const auditLogSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
});

export type AuditLogItem = z.infer<typeof auditLogSchema>;
