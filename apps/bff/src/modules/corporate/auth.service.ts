import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import * as argon2 from 'argon2';

// Use a shared PG pool; DATABASE_URL should be defined in env.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {
    console.log('AuthService constructor called - jwtService:', this.jwtService);
    console.log('AuthService constructor - this:', this);
  }

  async login(email: string, password: string) {
    const result = await pool.query(
      `SELECT id, email, password_hash, status FROM corporate_admins WHERE email = $1 LIMIT 1`,
      [email],
    );
    if (result.rows.length === 0 || result.rows[0].status !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const admin = result.rows[0];
    const valid = await argon2.verify(admin.password_hash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign({ id: admin.id, type: 'corporate_admin' });
    return { token, user: { id: admin.id, email: admin.email } };
  }

  async getCurrentAdmin(req: any) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const result = await pool.query(
      `SELECT id, email, status FROM corporate_admins WHERE id = $1 LIMIT 1`,
      [user.id],
    );
    if (result.rows.length === 0) {
      throw new UnauthorizedException();
    }
    const admin = result.rows[0];
    return { id: admin.id, email: admin.email, status: admin.status };
  }
}