'use client';
import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PortalProvider } from '@rhc/ui';
import { authAdapter } from './lib/supabase';
// The standalone provider QA page is not an RHC login or account-link flow.
// Its server middleware/page independently enforce loopback-only, configured QA;
// production returns HTTP 404. All normal customer routes retain their auth guard.
const publicRoutes = ['/', '/login', '/signin', '/register', '/forgot-password', '/reset-password', '/verification', '/auth/confirm', '/marketplace', '/ecosystem', '/help', '/future-technology', '/token', '/verify/rhc-id/*', ...(process.env.NODE_ENV === 'development' ? ['/thirdweb-qa'] : [])];
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useCallback((path: string) => router.replace(path), [router]);
  return <PortalProvider auth={authAdapter} apiUrl={process.env.NEXT_PUBLIC_API_URL} pathname={pathname} navigate={navigate} publicRoutes={publicRoutes}>{children}</PortalProvider>;
}
