-- Enable RLS on users
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running locally
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_org_read') THEN
    DROP POLICY users_org_read ON "users";
  END IF;
END $$;

-- Read policy bound to a request-scoped GUC
CREATE POLICY users_org_read ON "users"
  FOR SELECT
  USING (organization_id::text = current_setting('app.org_id', true));

-- Optional: tighter insert/update policies (future-safe)
-- CREATE POLICY users_org_write ON "users" FOR INSERT WITH CHECK (...)