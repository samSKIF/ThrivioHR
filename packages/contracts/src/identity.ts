import { z } from 'zod';
import { UUID, Email } from './primitives';

export const UserPublic = z.object({
  id: UUID,
  organizationId: UUID,
  email: Email,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  displayName: z.string().nullable()
});
export type UserPublic = z.infer<typeof UserPublic>;

export const OrgUnitPublic = z.object({
  id: UUID,
  organizationId: UUID,
  type: z.enum(['company','department','team']),
  name: z.string(),
  parentId: UUID.nullable()
});
export type OrgUnitPublic = z.infer<typeof OrgUnitPublic>;

export const LocationPublic = z.object({
  id: UUID,
  organizationId: UUID,
  name: z.string()
});
export type LocationPublic = z.infer<typeof LocationPublic>;