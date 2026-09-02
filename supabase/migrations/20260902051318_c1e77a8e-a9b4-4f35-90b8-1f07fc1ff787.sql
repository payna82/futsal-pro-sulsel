DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'role_requests'
      AND policyname = 'role_requests_admin_insert'
  ) THEN
    CREATE POLICY role_requests_admin_insert ON public.role_requests
      FOR INSERT TO authenticated
      WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;