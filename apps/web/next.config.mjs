/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@thrivio/ui', '@thrivio/types'],
};

export default nextConfig;