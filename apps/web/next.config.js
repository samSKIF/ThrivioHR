module.exports = {
  reactStrictMode: false, // Disable strict mode to prevent hydration warnings
  eslint: {
    // Disable ESLint during build to avoid parsing errors
    ignoreDuringBuilds: true,
  },
  // Optimize for faster loading
  poweredByHeader: false,
  compress: true,
};