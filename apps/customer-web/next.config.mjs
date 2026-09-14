import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rhc/ui', '@rhc/types'],
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
