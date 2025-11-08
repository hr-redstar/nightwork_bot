const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Cloud Run向けビルド
  reactStrictMode: true,
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'https://your-cloudrun-api-url',
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, './');
    return config;
  },
};

module.exports = nextConfig;