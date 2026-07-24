const path = require('path');
const fs = require('fs');

function readRootEnv(key, fallback) {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match ? match[1].trim() : fallback;
  } catch {
    return fallback;
  }
}

const API_URL = readRootEnv('API_URL', 'http://localhost:4000');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Proxy /api → backend : évite les erreurs CORS (localhost vs 127.0.0.1)
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || API_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'marneza.odoo.com',
        pathname: '/web/image/**',
      },
    ],
  },
};

module.exports = nextConfig;
