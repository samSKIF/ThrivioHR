import crypto from 'crypto';

export function signSession(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySession(token: string, secret: string): Record<string, unknown> {
  const [data, sig] = token.split('.');
  if (!data || !sig) throw new Error('Malformed token');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (expected !== sig) throw new Error('Bad signature');
  const json = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (Date.now() > json.exp) throw new Error('Expired token');
  return json;
}