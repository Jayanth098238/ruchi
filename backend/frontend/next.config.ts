import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Ensure CSS is properly processed during build
  webpack: (config) => {
    return config;
  }
};

export default nextConfig;
