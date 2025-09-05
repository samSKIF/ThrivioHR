import { Controller, Get, Post, Body, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import { IdentityService } from '../identity/identity.service';
import { AuthService } from './auth.service';
import { verifyPasswordHash, hashPassword, checkComplexity, getPolicy } from './password.util';

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
    await this.auth.issueTokensForEmail(email, res); // existing method used in SSO flow
    res.json({ ok: true, passwordResetRequired: !!user.password_reset_required });
  }

  @Get('me')
  async me(@Req() req, @Res() res) {
    // existing implementation...
    // Ensure passwordResetRequired is surfaced for the web app:
    const base = await this.auth.getProfileFromRequest(req); // existing helper in your codebase
    const passwordResetRequired = !!(base && (base as any).password_reset_required);
    res.json({ ...base, passwordResetRequired });
  }

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

    const prof = await this.auth.getProfileFromRequest(req);
    if (!prof?.sub) throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);

    const newHash = await hashPassword(pw);
    await this.identity.setUserPassword(prof.sub, newHash, true);
    res.json({ ok: true });
  }
}