// We mock next/server to avoid ESM/runtime requirements.
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: any) => ({ kind: 'redirect', url: String(url) }),
    next: () => ({ kind: 'next' })
  }
}));

import { middleware } from '../middleware';

function makeReq(url: string, token?: string) {
  return {
    url,
    cookies: {
      get: (_: string) => (token ? { value: token } : undefined)
    }
  } as any;
}

test('unauth /admin -> redirects to /login', () => {
  const res = middleware(makeReq('http://localhost:3000/admin'));
  expect(res).toHaveProperty('kind', 'redirect');
  expect(String((res as any).url)).toContain('/login');
});

test('authed /admin -> next()', () => {
  const res = middleware(makeReq('http://localhost:3000/admin', 'token'));
  expect(res).toHaveProperty('kind', 'next');
});