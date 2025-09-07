# ThrivioHR Data Dictionary (Lean v1)

## Tenancy
- Pooled Postgres; tenant rows include `org_id`.
- Service-enforced scoping; DB RLS later.
- Upgrade path: schema-per-tenant / DB-per-tenant.

## organizations
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| name | text | yes |  |
| slug | text unique | yes | url-safe |
| status | enum(active,suspended,trial,closed) | yes |  |
| timezone | text | no | IANA |
| primary_currency | char(3) | no | ISO‑4217 |
| website_url | text | no | https://… |
| instagram_url | text | no | instagram.com only |
| x_url | text | no | x.com (normalize twitter.com) |
| linkedin_url | text | no | linkedin.com/company/... |
| industry | text | no | company industry |
| max_users | int | no | seat limit; null means unlimited |
| contact_name | text | no | primary contact |
| contact_email | text | no | email for corporate admin contact |
| contact_phone_e164 | text | no | phone in E.164 |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

## users
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| org_id | uuid fk(organizations) | yes |  |
| email | citext unique(global) | yes | 1 email → 1 org |
| password_hash | text | no | null for SSO |
| role | enum(org_admin, employee) | yes |  |
| status | enum(active, invited, disabled) | yes |  |
| password_reset_required | bool | yes | default true for admin/CSV/API |
| password_changed_at | timestamptz | no |  |
| last_login_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |

## user_profiles
| field | type | req | notes |
|---|---|---|---|
| user_id | uuid pk/fk(users) | yes | 1:1 |
| first_name | text | no |  |
| last_name | text | no |  |
| phone_e164 | text | no | +971… |
| birth_date | date | no |  |
| home_address_json | jsonb | no | {line1,city,zip,country} |
| emergency_contact_name | text | no |  |
| emergency_contact_phone_e164 | text | no |  |
| emergency_contact_relation | text | no |  |
| avatar_url | text | no |  |
| cover_url | text | no |  |
| interests_json | jsonb | no | ["wellness","tech"] |
| linkedin_url | text | no | linkedin.com/in/... |
| profile_completion_pct | int | no | cached 0–100 |
| profile_checklist_state_json | jsonb | no | checklist flags |
| updated_at | timestamptz | yes |  |

## organization_domains
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| org_id | uuid fk(organizations) | yes |  |
| domain | citext unique | yes | 1 domain → 1 org |
| is_primary | bool | yes | default true |
| created_at | timestamptz | yes |  |

## import_jobs
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| org_id | uuid fk(organizations) | yes |  |
| created_by | uuid fk(users) | yes | admin |
| source | enum(csv, api) | yes |  |
| status | enum(validated, committed, rejected) | yes |  |
| total_rows | int | yes |  |
| valid_rows | int | yes |  |
| mismatch_rows | int | yes |  |
| duplicate_rows | int | yes |  |
| accepted_mismatches | bool | no | default false |
| mismatch_domains | jsonb | no | ["gmial.com", …] |
| report_url | text | no | s3://… |
| created_at | timestamptz | yes |  |
| committed_at | timestamptz | no |  |
| rejected_at | timestamptz | no |  |

## subscriptions
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| org_id | uuid fk(organizations) | yes |  |
| plan_code | text | yes |  |
| seats_limit | int | yes | maximum seats purchased |
| subscribed_users | int | yes | number of seats currently subscribed |
| price_per_user_per_month | numeric(12,2) | yes | price per user per month |
| subscription_period | enum(month,quarter,year) | yes | billing frequency |
| total_monthly_amount | numeric(12,2) | yes | seats_limit × price_per_user_per_month |
| status | enum(trial,active,past_due,canceled,expired) | yes | current state |
| start_at | timestamptz | yes | subscription start date |
| expiration_date | timestamptz | no | end date of current term |
| last_payment_date | timestamptz | no | timestamp of most recent payment |
| created_at | timestamptz | yes | record creation |

## sessions (existing; reference)
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| user_id | uuid fk(users) | yes |  |
| refresh_token_hash | text | yes |  |
| ip | text | no |  |
| user_agent | text | no |  |
| created_at | timestamptz | yes |  |
| expires_at | timestamptz | yes |  |

## events (tracking seed)
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| org_id | uuid | yes |  |
| user_id | uuid | no | null for system |
| event_type | text | yes | login_success, password_changed, user_bulk_preview, user_bulk_committed, domain_mismatch_accepted, profile_updated |
| metadata_json | jsonb | no |  |
| timestamp | timestamptz | yes |  |

## Notes
- No roles m:n join yet; single role on `users` until RBAC is needed.
- Directory tables (departments/locations/units) land with Big 4.
- Marketplace/ledger/social feed tables wait for PRDs; not included here to avoid bloat.

## corporate_admins
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| email | citext unique | yes | global unique corporate admin email |
| password_hash | text | yes | Argon2id + pepper |
| status | enum(active,disabled) | yes | account state |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

## wallet_transactions
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| org_id | uuid fk(organizations) | yes | organization receiving the credit/debit |
| amount | numeric(12,2) | yes | positive credit or negative debit |
| description | text | yes | reason for the transaction |
| created_at | timestamptz | yes |  |

## organization_features
| field | type | req | notes |
|---|---|---|---|
| id | uuid pk | yes |  |
| org_id | uuid fk(organizations) | yes |  |
| feature_name | text | yes | name of the feature (e.g., recognition) |
| is_enabled | bool | yes | default false |
| created_at | timestamptz | yes |  |