import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const cible = process.env.API_URL ?? "http://localhost:8000";
    return [{ source: "/backend/:path*", destination: `${cible}/:path*` }];
  },
};

export default nextConfig;
