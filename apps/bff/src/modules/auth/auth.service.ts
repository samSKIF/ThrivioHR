import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../env';
import { DRIZZLE_DB } from '../db/db.module';
import { users, sessions } from '../../../../../services/identity/src/db/schema';
import type { LoginDto } from './dto/login.dto';
import type { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(@Inject(DRIZZLE_DB) private db: NodePgDatabase<Record<string, unknown>>) {
    this.jwtSecret = getJwtSecret();
  }

  async login(loginDto: LoginDto) {
    const { orgId, email } = loginDto;

    // Find user by orgId and email
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.organizationId, orgId), eq(users.email, email)));

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create session
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes
    const sessionToken = `sess_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: user.id,
        token: sessionToken,
        expiresAt: expiresAt,
        ipAddress: null,
        userAgent: null,
      })
      .returning();

    // Generate tokens with complete user data
    const tokenPayload = {
      sub: user.id,
      orgId,
      sid: session.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
    };

    const accessToken = jwt.sign(
      tokenPayload,
      this.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      tokenPayload,
      this.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        orgId: user.organizationId,
        email: user.email,
      },
    };
  }

  async refresh(refreshDto: RefreshDto) {
    const { refreshToken } = refreshDto;

    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as Record<string, unknown>;
      
      // Generate new access token with same claims including user data
      const accessToken = jwt.sign(
        { 
          sub: decoded.sub, 
          orgId: decoded.orgId, 
          sid: decoded.sid,
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          displayName: decoded.displayName,
        },
        this.jwtSecret,
        { expiresIn: '15m' }
      );

      return { accessToken };
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Method for OIDC integration to mint tokens for existing users
  async issueTokensForEmail(email: string, profile?: { firstName?: string; lastName?: string; displayName?: string; }) {
    // Find user by email (first org match for single-tenant config phase)
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found for email: ' + email);
    }

    // Create session
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes
    const sessionToken = `sess_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: user.id,
        token: sessionToken,
        expiresAt: expiresAt,
        ipAddress: null,
        userAgent: null,
      })
      .returning();

    // Generate tokens with complete user data (use profile if provided, otherwise user data)
    const tokenPayload = {
      sub: user.id,
      orgId: user.organizationId,
      sid: session.id,
      email: user.email,
      firstName: profile?.firstName || user.firstName,
      lastName: profile?.lastName || user.lastName,
      displayName: profile?.displayName || user.displayName,
    };

    const accessToken = jwt.sign(
      tokenPayload,
      this.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      tokenPayload,
      this.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        orgId: user.organizationId,
        email: user.email,
      },
    };
  }
}