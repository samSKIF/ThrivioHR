const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Proxy all auth requests to the BFF
        source: '/auth/:path*',
        destination: `${apiBase}/auth/:path*`,
      },
      {
        // Proxy GraphQL API to the BFF
        source: '/graphql',
        destination: `${apiBase}/graphql`,
      },
    ];
  },
};