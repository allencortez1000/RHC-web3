import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rhc/ui', '@rhc/types'],
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
};
export default nextConfig;
