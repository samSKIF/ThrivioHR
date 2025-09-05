import { Controller, Get, Post, Body, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import { IdentityService } from '../identity/identity.service';
import { AuthService } from './auth.service';
import { verifyPasswordHash, hashPassword, checkComplexity, getPolicy } from './password.util';

// Lightweight JWT payload decode (no signature verify) to read `sub` from sid cookie.
function readSidSub(req: any): string | null {
  const raw = req?.cookies?.sid || (req?.headers?.cookie || '').split(';').find((c: string)=>c.trim().startsWith('sid='))?.split('=')[1];
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload?.sub ?? null;
  } catch { return null; }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly identity: IdentityService,
    private readonly auth: AuthService,
  ) {}

  /** Email+password login */
  @Post('login')
  async loginLocal(@Body() body: any, @Res() res) {
    const email = (body?.email || '').toString().trim();
    const password = (body?.password || '').toString();
    if (!email || !password) throw new HttpException('missing_credentials', HttpStatus.BAD_REQUEST);

    const user = await this.identity.findUserByEmailCI(email);
    if (!user?.id || !user?.password_hash) throw new HttpException('invalid_credentials', HttpStatus.FORBIDDEN);

    const ok = await verifyPasswordHash(user.password_hash, password);
    if (!ok) throw new HttpException('invalid_credentials', HttpStatus.FORBIDDEN);

    await this.identity.recordLoginSuccess(user.id).catch(() => {});

    // Issue same cookies used by OIDC flow
    await this.auth.issueTokensForEmail(email, res); // existing SSO helper
    res.json({ ok: true, passwordResetRequired: !!user.password_reset_required });
  }

  // DO NOT override existing /auth/me handler; retain previous implementation in the file.
  // (If this method does not exist in your file, ignore this comment — no changes applied.)

  /** Return password policy */
  @Get('password/policy')
  policy(@Res() res) {
    res.json(getPolicy());
  }

  /** First-time password set (requires auth cookie) */
  @Post('password/first-set')
  async firstSet(@Req() req, @Body() body: any, @Res() res) {
    const pw = (body?.passwordNew || '').toString();
    const c = checkComplexity(pw);
    if (!c.ok) throw new HttpException({ error: 'weak_password', reasons: c.reasons }, HttpStatus.BAD_REQUEST);

    const sub = readSidSub(req);
    if (!sub) throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);

    const newHash = await hashPassword(pw);
    await this.identity.setUserPassword(sub, newHash, true);
    res.json({ ok: true });
  }
}