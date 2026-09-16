'use client';
import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PortalProvider } from '@rhc/ui';
import { authAdapter } from './lib/supabase';
const publicRoutes = ['/', '/login', '/signin', '/register', '/forgot-password', '/reset-password', '/verification', '/auth/confirm', '/marketplace', '/verify/rhc-id/*'];
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useCallback((path: string) => router.replace(path), [router]);
  return <PortalProvider auth={authAdapter} apiUrl={process.env.NEXT_PUBLIC_API_URL} pathname={pathname} navigate={navigate} publicRoutes={publicRoutes}>{children}</PortalProvider>;
}
