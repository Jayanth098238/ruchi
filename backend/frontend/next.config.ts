<<<<<<< HEAD
/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,

  images: {
    unoptimized: true,
  },

  allowedDevOrigins: [
    '10.238.86.205',
  ],
};

module.exports = nextConfig;
=======
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
>>>>>>> c933d578a2791be289466d4e6cfee98cfc91080e
