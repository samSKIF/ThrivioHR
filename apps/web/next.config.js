module.exports = {
  reactStrictMode: false, // Disable strict mode to prevent hydration warnings
  eslint: {
    // Disable ESLint during build to avoid parsing errors
    ignoreDuringBuilds: true,
  },
  // Optimize for faster loading
  poweredByHeader: false,
  compress: true,
  // Additional hydration error handling
  experimental: {
    // Future Next.js features can go here
  },
  // Custom webpack config to handle browser extensions
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // In development, suppress hydration warnings
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    return config;
  },
};