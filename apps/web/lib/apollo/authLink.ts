export function buildAuthHeaders(getToken: () => string | null) {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}