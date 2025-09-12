import { Injectable } from '@nestjs/common';
import { IdentityRepository } from '../../identity/identity.repository';
import { IdentityPort } from '../ports/identity.port';

/**
 * Adapter that implements IdentityPort using IdentityRepository
 * This isolates the ImportModule from direct dependencies
 */
@Injectable()
export class IdentityAdapter implements IdentityPort {
  constructor(private readonly identityRepo: IdentityRepository) {}

  async findUserByEmailOrg(email: string, orgId: string) {
    return this.identityRepo.findUserByEmailOrg(email, orgId);
  }

  async createUser(
    orgId: string, 
    email: string, 
    firstName: string | null, 
    lastName: string | null, 
    jobTitle: string, 
    department: string, 
    location: string, 
    hireDate: string
  ) {
    return this.identityRepo.createUser(
      orgId, email, firstName, lastName, 
      jobTitle, department, location, hireDate
    );
  }

  async updateUserNames(userId: string, firstName: string | null, lastName: string | null): Promise<void> {
    await this.identityRepo.updateUserNames(userId, firstName, lastName);
  }

  async listDistinctDepartments(orgId: string) {
    return this.identityRepo.listDistinctDepartments(orgId);
  }

  async findOrCreateDepartment(orgId: string, name: string) {
    return this.identityRepo.findOrCreateDepartment(orgId, name);
  }

  async listDistinctLocations(orgId: string) {
    return this.identityRepo.listDistinctLocations(orgId);
  }

  async findOrCreateLocation(orgId: string, name: string) {
    return this.identityRepo.findOrCreateLocation(orgId, name);
  }

  async ensureMembership(userId: string, deptId: string) {
    return this.identityRepo.ensureMembership(userId, deptId);
  }
}