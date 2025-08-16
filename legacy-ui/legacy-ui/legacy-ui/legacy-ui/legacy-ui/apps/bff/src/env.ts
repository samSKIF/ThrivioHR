// Central helper for JWT secret with safe defaults only in dev.
let _cachedSecret: string | null = null;

export function getJwtSecret(): string {
  if (_cachedSecret) return _cachedSecret;
  
  const s = process.env.JWT_SECRET;
  const isDev = (process.env.NODE_ENV ?? 'development') === 'development';
  
  if (!s) {
    if (!isDev) {
      throw new Error('JWT_SECRET is required in non-development environments.');
    }
    // Dev fallback with one-time warning
    console.warn('[WARN] Using development JWT secret fallback. Set JWT_SECRET for safer behavior.');
    _cachedSecret = 'dev-secret';
    return _cachedSecret;
  }
  
  _cachedSecret = s;
  return _cachedSecret;
}