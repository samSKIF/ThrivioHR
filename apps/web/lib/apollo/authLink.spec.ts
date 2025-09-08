import { buildAuthHeaders } from './authLink';

describe('buildAuthHeaders', () => {
  it('adds Authorization when token exists', () => {
    // Sanity checks for environment and jest-dom setup
    expect(process.env.NEXT_PUBLIC_BFF_BASE_URL).toBeTruthy();
    expect(document.body).toBeInTheDocument();
    
    const h = buildAuthHeaders(() => 'abc');
    expect(h.Authorization).toBe('Bearer abc');
  });
  it('omits Authorization when no token', () => {
    const h = buildAuthHeaders(() => null);
    expect('Authorization' in h).toBe(false);
  });
});