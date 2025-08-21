const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
module.exports = {
  reactStrictMode: true,
  eslint: {
    // Disable ESLint during build to avoid parsing errors
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        // Proxy all BFF API requests
        source: '/api/bff/:path*',
        destination: `${apiBase}/:path*`,
      },
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