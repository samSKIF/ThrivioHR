/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
  env: {
    // For future use if we wire through envs; currently we hardcode 127.0.0.1:5000 in fetch
    BFF_BASE_URL: "http://127.0.0.1:5000",
  },
  // Disable PostCSS processing to avoid Tailwind conflicts
  postcss: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;