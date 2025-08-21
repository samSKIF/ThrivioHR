/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
  env: {
    // Optional: if you want the proxy to target a custom BFF URL server-side.
    BFF_INTERNAL_URL: process.env.BFF_INTERNAL_URL || "http://127.0.0.1:5000",
  },
};
export default nextConfig;