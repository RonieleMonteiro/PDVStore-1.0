import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: ["localhost"],
  },
  // Permite usar Prisma e banco diretamente nas API Routes e Server Components
  experimental: {},
}

export default nextConfig
