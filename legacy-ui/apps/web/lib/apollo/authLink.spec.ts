import { buildAuthHeaders } from './authLink';

describe('buildAuthHeaders', () => {
  it('adds Authorization when token exists', () => {
    const h = buildAuthHeaders(() => 'abc');
    expect(h.Authorization).toBe('Bearer abc');
  });
  it('omits Authorization when no token', () => {
    const h = buildAuthHeaders(() => null);
    expect('Authorization' in h).toBe(false);
  });
});