import { IsEmail, IsUUID } from 'class-validator';

export class LoginDto {
  @IsUUID()
  orgId: string;

  @IsEmail()
  email: string;
}