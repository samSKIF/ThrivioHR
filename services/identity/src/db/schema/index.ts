export * from './organizations';
export * from './users';
export * from './identities';
export * from './roles';
export * from './role_bindings';
export * from './sessions';
export * from './org_units';
export * from './org_membership';
export * from './locations';
export * from './employment_events';
export * from './corporateAdmins';
export * from './subscriptions';
export * from './walletTransactions';
export * from './organizationFeatures';
export * from './organizationDomains';
export * from './importJobs';  
export * from './events';

import { organizations } from './organizations';
import { users } from './users';
import { identities } from './identities';
import { roles } from './roles';
import { roleBindings } from './role_bindings';
import { sessions } from './sessions';
import { orgUnits } from './org_units';
import { orgMembership } from './org_membership';
import { locations } from './locations';
import { employmentEvents } from './employment_events';
import { corporateAdmins } from './corporateAdmins';
import { subscriptions } from './subscriptions';
import { walletTransactions } from './walletTransactions';
import { organizationFeatures } from './organizationFeatures';
import { organizationDomains } from './organizationDomains';
import { importJobs } from './importJobs';
import { events } from './events';

import type { PgTable } from 'drizzle-orm/pg-core';

export const allTables: PgTable[] = [
  organizations,
  users,
  identities,
  roles,
  roleBindings,
  sessions,
  orgUnits,
  orgMembership,
  locations,
  employmentEvents,
  corporateAdmins,
  subscriptions,
  walletTransactions,
  organizationFeatures,
  organizationDomains,
  importJobs,
  events,
];