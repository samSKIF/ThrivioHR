-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop if exists to keep idempotency in ephemeral schemas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'users' AND policyname = 'users_org_read'
  ) THEN
    EXECUTE 'DROP POLICY users_org_read ON users';
  END IF;
END$$;

-- Read policy scoped by org
CREATE POLICY users_org_read
ON users
FOR SELECT
USING (
  -- Expecting the app to set the current org in the session for tests
  -- e.g., SELECT set_config('app.org_id', '<uuid>', true);
  org_id::text = current_setting('app.org_id', true)
);