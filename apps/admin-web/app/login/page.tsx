import { redirect } from 'next/navigation';
import { AuthPage } from '@rhc/ui';

export default function Page() {
  if (process.env.NEXT_PUBLIC_RHC_DATA_MODE === 'demo') {
    redirect(`${process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL || 'http://localhost:3002'}/login`);
  }
  return <AuthPage admin mode="login" title="Admin Sign In" />;
}
