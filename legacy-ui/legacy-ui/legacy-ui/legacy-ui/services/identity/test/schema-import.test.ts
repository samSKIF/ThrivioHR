// Ensures schema modules are loaded and covered
import * as org from '../src/db/schema/organizations';
import * as users from '../src/db/schema/users';
import * as ids from '../src/db/schema/identities';
import * as roles from '../src/db/schema/roles';
import * as rbs from '../src/db/schema/role_bindings';
import * as sess from '../src/db/schema/sessions';
import * as ous from '../src/db/schema/org_units';
import * as mem from '../src/db/schema/org_membership';
import * as loc from '../src/db/schema/locations';
import * as ee from '../src/db/schema/employment_events';

test('schema modules load', () => {
  expect(org).toBeDefined();
  expect(users).toBeDefined();
  expect(ids).toBeDefined();
  expect(roles).toBeDefined();
  expect(rbs).toBeDefined();
  expect(sess).toBeDefined();
  expect(ous).toBeDefined();
  expect(mem).toBeDefined();
  expect(loc).toBeDefined();
  expect(ee).toBeDefined();
});