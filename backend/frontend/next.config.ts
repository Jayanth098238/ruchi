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