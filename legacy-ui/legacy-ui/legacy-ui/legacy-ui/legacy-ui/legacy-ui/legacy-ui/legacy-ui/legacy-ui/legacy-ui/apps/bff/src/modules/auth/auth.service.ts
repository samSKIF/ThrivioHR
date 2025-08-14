import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { DRIZZLE_DB } from '../db/db.module';
import { users, sessions } from '../../../../../services/identity/src/db/schema';
import type { LoginDto } from './dto/login.dto';
import type { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(@Inject(DRIZZLE_DB) private db: any) {
    this.jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';
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

    // Generate tokens
    const accessToken = jwt.sign(
      { sub: user.id, orgId, sid: session.id },
      this.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, orgId, sid: session.id },
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
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
      
      // Generate new access token with same claims
      const accessToken = jwt.sign(
        { sub: decoded.sub, orgId: decoded.orgId, sid: decoded.sid },
        this.jwtSecret,
        { expiresIn: '15m' }
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}