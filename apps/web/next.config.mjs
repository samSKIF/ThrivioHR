/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
  env: {
    BFF_INTERNAL_URL: process.env.BFF_INTERNAL_URL || "http://127.0.0.1:5000",
    NEXT_PUBLIC_THEME: process.env.NEXT_PUBLIC_THEME || "legacy",
  },
};
export default nextConfig;