import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IdentityRepository } from './identity.repository';
import { CreateOrgDto } from './dtos/create-org.dto';
import { CreateUserDto } from './dtos/create-user.dto';

@Injectable()
export class IdentityService {
  constructor(
    @Inject(forwardRef(() => IdentityRepository))
    private readonly repository: IdentityRepository
  ) {}

  async createOrganization(createOrgDto: CreateOrgDto) {
    return this.repository.createOrganization(createOrgDto.name);
  }

  async getOrganizations(limit = 20) {
    return this.repository.getOrganizations(limit);
  }

  async createUser(createUserDto: CreateUserDto) {
    return this.repository.createUser(
      createUserDto.orgId,
      createUserDto.email,
      createUserDto.givenName,
      createUserDto.familyName,
    );
  }

  async getUsersByOrg(orgId: string, limit = 20) {
    return this.repository.getUsersByOrg(orgId, limit);
  }
}