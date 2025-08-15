-- Create concurrently to avoid table write locks in prod
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_org_created_id" ON "users" USING btree ("organization_id","created_at","id");