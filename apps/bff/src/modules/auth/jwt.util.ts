import * as jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export type UserClaims = { sub: string; email?: string; name?: string };

export function signUserJwt(claims: UserClaims, ttl = '15m'): string {
  return jwt.sign(claims, SECRET, { expiresIn: ttl });
}