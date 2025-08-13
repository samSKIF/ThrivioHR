import { client, db } from '../db';
import * as schema from '../db/schema';

async function seed() {
  try {
    await client.connect();
    console.log('Connected to database for seeding...');

    // Insert organization
    const [org] = await db
      .insert(schema.organizations)
      .values({
        name: 'Acme',
        domain: 'acme.com',
        isActive: true,
      })
      .returning();
    console.log(`Inserted organization: ${org.name}`);

    // Insert locations
    const [country] = await db
      .insert(schema.locations)
      .values({
        organizationId: org.id,
        type: 'country',
        name: 'United States',
        code: 'US',
      })
      .returning();

    const [city] = await db
      .insert(schema.locations)
      .values({
        organizationId: org.id,
        parentId: country.id,
        type: 'city',
        name: 'New York City',
        code: 'NYC',
      })
      .returning();

    const [site] = await db
      .insert(schema.locations)
      .values({
        organizationId: org.id,
        parentId: city.id,
        type: 'site',
        name: 'Headquarters',
        code: 'HQ',
        address: '123 Main St, New York, NY 10001',
      })
      .returning();
    console.log(`Inserted ${3} locations`);

    // Insert org units
    const [company] = await db
      .insert(schema.orgUnits)
      .values({
        organizationId: org.id,
        type: 'company',
        name: 'Acme Corporation',
        description: 'Main company entity',
      })
      .returning();

    const [department] = await db
      .insert(schema.orgUnits)
      .values({
        organizationId: org.id,
        parentId: company.id,
        type: 'department',
        name: 'Engineering',
        description: 'Software development department',
      })
      .returning();

    const [team] = await db
      .insert(schema.orgUnits)
      .values({
        organizationId: org.id,
        parentId: department.id,
        type: 'team',
        name: 'Platform Team',
        description: 'Core platform development team',
      })
      .returning();
    console.log(`Inserted ${3} org units`);

    // Insert roles
    const [superAdminRole] = await db
      .insert(schema.roles)
      .values({
        organizationId: org.id,
        name: 'TenantSuperAdmin',
        description: 'Full organization administration',
        permissions: JSON.stringify(['*']),
      })
      .returning();

    const [managerRole] = await db
      .insert(schema.roles)
      .values({
        organizationId: org.id,
        name: 'Manager',
        description: 'Department/team management',
        permissions: JSON.stringify(['manage_team', 'view_reports']),
      })
      .returning();

    const [employeeRole] = await db
      .insert(schema.roles)
      .values({
        organizationId: org.id,
        name: 'Employee',
        description: 'Standard employee role',
        permissions: JSON.stringify(['view_profile', 'submit_recognition']),
      })
      .returning();
    console.log(`Inserted ${3} roles`);

    // Insert users
    const [adminUser] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'admin@acme.com',
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'System Administrator',
        isActive: true,
      })
      .returning();

    const [managerUser] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'manager@acme.com',
        firstName: 'Jane',
        lastName: 'Manager',
        displayName: 'Jane Manager',
        isActive: true,
      })
      .returning();

    const [employeeUser] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'employee@acme.com',
        firstName: 'John',
        lastName: 'Employee',
        displayName: 'John Employee',
        isActive: true,
      })
      .returning();
    console.log(`Inserted ${3} users`);

    // Insert identities
    await db.insert(schema.identities).values([
      {
        userId: adminUser.id,
        provider: 'local',
        providerSubject: 'admin@acme.com',
        providerData: JSON.stringify({ type: 'local' }),
      },
      {
        userId: managerUser.id,
        provider: 'local',
        providerSubject: 'manager@acme.com',
        providerData: JSON.stringify({ type: 'local' }),
      },
      {
        userId: employeeUser.id,
        provider: 'local',
        providerSubject: 'employee@acme.com',
        providerData: JSON.stringify({ type: 'local' }),
      },
    ]);
    console.log(`Inserted ${3} identities`);

    // Insert role bindings
    await db.insert(schema.roleBindings).values([
      {
        userId: adminUser.id,
        roleId: superAdminRole.id,
        organizationId: org.id,
        scope: 'org',
        scopeId: org.id,
        financeCapability: true,
      },
      {
        userId: managerUser.id,
        roleId: managerRole.id,
        organizationId: org.id,
        scope: 'department',
        scopeId: department.id,
        financeCapability: false,
      },
      {
        userId: employeeUser.id,
        roleId: employeeRole.id,
        organizationId: org.id,
        scope: 'team',
        scopeId: team.id,
        financeCapability: false,
      },
    ]);
    console.log(`Inserted ${3} role bindings`);

    // Insert org memberships
    await db.insert(schema.orgMembership).values([
      {
        userId: adminUser.id,
        orgUnitId: company.id,
        isPrimary: true,
      },
      {
        userId: managerUser.id,
        orgUnitId: department.id,
        isPrimary: true,
      },
      {
        userId: employeeUser.id,
        orgUnitId: team.id,
        isPrimary: true,
      },
    ]);
    console.log(`Inserted ${3} org memberships`);

    // Insert employment events
    await db.insert(schema.employmentEvents).values([
      {
        userId: adminUser.id,
        eventType: 'hire',
        effectiveFrom: new Date('2023-01-01'),
        payload: { position: 'System Administrator', salary: 120000 },
        notes: 'Initial hire as system administrator',
      },
      {
        userId: managerUser.id,
        eventType: 'hire',
        effectiveFrom: new Date('2023-02-01'),
        payload: { position: 'Engineering Manager', salary: 110000 },
        notes: 'Hired as engineering manager',
      },
      {
        userId: employeeUser.id,
        eventType: 'hire',
        effectiveFrom: new Date('2023-03-01'),
        payload: { position: 'Software Engineer', salary: 85000 },
        notes: 'Hired as software engineer',
      },
    ]);
    console.log(`Inserted ${3} employment events`);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed();
}

export default seed;