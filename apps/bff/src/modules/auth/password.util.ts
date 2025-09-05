import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

export async function hashPassword(pw: string): Promise<string> {
  // modest, fast dev settings; tune via env later
  return argonHash(pw, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });
}

export async function verifyPasswordHash(hashStr: string, pw: string): Promise<boolean> {
  try { return await argonVerify(hashStr, pw); } catch { return false; }
}

export type PasswordPolicy = {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
};

export function getPolicy(): PasswordPolicy {
  const n = (k: string, d: number) => Number(process.env[k] || d);
  const b = (k: string, d: boolean) => (process.env[k] ?? '').toString() === 'true' ? true : d;
  return {
    minLength: n('PASSWORD_MIN_LENGTH', 8),
    requireUpper: b('PASSWORD_REQUIRE_UPPER', true),
    requireLower: b('PASSWORD_REQUIRE_LOWER', true),
    requireDigit: b('PASSWORD_REQUIRE_DIGIT', true),
    requireSymbol: b('PASSWORD_REQUIRE_SYMBOL', true),
  };
}

export function checkComplexity(pw: string): { ok: boolean; reasons: string[] } {
  const p = getPolicy();
  const reasons: string[] = [];
  if (!pw || pw.length < p.minLength) reasons.push('min_length');
  if (p.requireUpper && !/[A-Z]/.test(pw)) reasons.push('upper');
  if (p.requireLower && !/[a-z]/.test(pw)) reasons.push('lower');
  if (p.requireDigit && !/[0-9]/.test(pw)) reasons.push('digit');
  if (p.requireSymbol && !/[^A-Za-z0-9]/.test(pw)) reasons.push('symbol');
  return { ok: reasons.length === 0, reasons };
}