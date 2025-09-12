/**
 * Port interface for Identity operations needed by Import module
 * This avoids circular dependencies by defining only what we need
 */

// Token for dependency injection
export const IDENTITY_PORT = Symbol('IDENTITY_PORT');

export interface IdentityPort {
  // User operations
  findUserByEmailOrg(email: string, orgId: string): Promise<any>;
  createUser(orgId: string, email: string, firstName: string | null, lastName: string | null, 
            jobTitle: string, department: string, location: string, hireDate: string): Promise<any>;
  updateUserNames(userId: string, firstName: string | null, lastName: string | null): Promise<void>;

  // Department operations
  listDistinctDepartments(orgId: string): Promise<string[]>;
  findOrCreateDepartment(orgId: string, name: string): Promise<{ dept: any; created: boolean }>;

  // Location operations
  listDistinctLocations(orgId: string): Promise<string[]>;
  findOrCreateLocation(orgId: string, name: string): Promise<{ loc: any; created: boolean }>;

  // Membership operations
  ensureMembership(userId: string, deptId: string): Promise<{ created: boolean }>;
}