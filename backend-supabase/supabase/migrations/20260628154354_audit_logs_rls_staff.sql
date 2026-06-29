-- Enable RLS on audit_logs (already enabled, idempotent)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow staff to INSERT audit entries
DROP POLICY IF EXISTS audit_logs_insert_staff ON public.audit_logs;
CREATE POLICY audit_logs_insert_staff ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'editor', 'admin', 'superadmin')
    )
  );

-- Allow staff to SELECT audit entries
DROP POLICY IF EXISTS audit_logs_select_staff ON public.audit_logs;
CREATE POLICY audit_logs_select_staff ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'editor', 'admin', 'superadmin')
    )
  );
