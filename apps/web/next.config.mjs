/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
  env: {
    // Public URL of the BFF (HTTPS on Replit). Set this in Secrets:
    // NEXT_PUBLIC_BFF_URL=https://<your-bff-public-host>/  (no trailing slash also fine)
    NEXT_PUBLIC_BFF_URL: process.env.NEXT_PUBLIC_BFF_URL || "http://127.0.0.1:5000",
  },
};
export default nextConfig;