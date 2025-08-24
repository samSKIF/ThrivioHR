-- === Big 3c: Local Auth & Org/Import scaffolding ===

-- 1) organizations: social URLs (URL-only; validation enforced in app)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS website_url   text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS x_url         text,
  ADD COLUMN IF NOT EXISTS linkedin_url  text;

-- 2) users: local-auth columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash              text,
  ADD COLUMN IF NOT EXISTS password_reset_required    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS failed_attempts            int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until               timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at              timestamptz;

-- 3) Global-unique email (case-insensitive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_unique_lower') THEN
    CREATE UNIQUE INDEX users_email_unique_lower ON users ((lower(email)));
  END IF;
END$$;

-- 4) user_profiles (1:1)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name text,
  last_name  text,
  phone_e164 text,
  birth_date date,
  home_address_json jsonb,
  emergency_contact_name text,
  emergency_contact_phone_e164 text,
  emergency_contact_relation text,
  avatar_url text,
  cover_url  text,
  interests_json jsonb,
  linkedin_url text,
  profile_completion_pct int,
  profile_checklist_state_json jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) organization_domains (domain → org mapping)
CREATE TABLE IF NOT EXISTS organization_domains (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- unique lower(domain)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='organization_domains_domain_lower_key' AND n.nspname=current_schema) THEN
    CREATE UNIQUE INDEX organization_domains_domain_lower_key ON organization_domains ((lower(domain)));
  END IF;
END$$;

-- 6) import_jobs (CSV/API preview+commit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_job_source') THEN
    CREATE TYPE import_job_source AS ENUM ('csv','api');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_job_status') THEN
    CREATE TYPE import_job_status AS ENUM ('validated','committed','rejected');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  source import_job_source NOT NULL,
  status import_job_status NOT NULL,
  total_rows int NOT NULL,
  valid_rows int NOT NULL,
  mismatch_rows int NOT NULL,
  duplicate_rows int NOT NULL,
  accepted_mismatches boolean DEFAULT false,
  mismatch_domains jsonb,
  report_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz,
  rejected_at timestamptz
);

-- 7) subscriptions (minimal)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('trial','active','past_due','canceled','expired');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_code text NOT NULL,
  seats_limit int NOT NULL,
  status subscription_status NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8) events (tracking seeds)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  metadata_json jsonb,
  "timestamp" timestamptz NOT NULL DEFAULT now()
);