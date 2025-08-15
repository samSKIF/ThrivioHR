-- Create concurrently to avoid write locks in production
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_created_id
  ON users (organization_id, created_at, id);