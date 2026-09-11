import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'], theme: { extend: { colors: { rhc: { navy: '#0f172a', gold: '#b08d57' } } } }, plugins: [] };
export default config;
