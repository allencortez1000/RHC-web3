'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, Badge, Card, EmptyState, ResourceStatus, Web3Button } from '@rhc/ui';

type VerificationResult = {
  valid: boolean;
  status: 'VALID' | 'INVALID' | 'REVOKED' | 'INACTIVE';
  rhc_id?: string;
  display_name?: string;
  verification_status?: string;
  issued_at?: string;
  message?: string;
};

const demoRhcId = 'RHC-2026-00000001';
const demoToken = typeof window !== 'undefined' ? window.btoa(demoRhcId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';

export default function VerifyRhcIdPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VerificationResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    setLoading(true);
    setError('');
    if (!apiUrl) {
      const isDemo = token === demoToken;
      setData(isDemo ? {
        valid: true,
        status: 'VALID',
        rhc_id: demoRhcId,
        display_name: 'Demo C•••••••',
        verification_status: 'VERIFIED',
        issued_at: '2026-09-11T00:00:00.000Z',
      } : { valid: false, status: 'INVALID', message: 'RHC Digital ID verification token is invalid.' });
      setLoading(false);
      return;
    }
    fetch(`${apiUrl.replace(/\/$/, '')}/verify/rhc-id/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message || body?.message || 'Verification failed.');
        return body?.success === true ? body.data : body;
      })
      .then((result) => { if (active) setData(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Verification failed.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  return (
    <AppShell title="RHC Digital ID Verification" navItems={[]} hideSidebar>
      <section className="mx-auto max-w-3xl">
        <Card title="Public Verification Result">
          <ResourceStatus loading={loading} error={error} reload={() => window.location.reload()} />
          {data && (
            data.valid ? (
              <div className="grid gap-4">
                <Badge tone="gold">VALID</Badge>
                <p className="font-mono text-2xl font-black text-[var(--rhc-heading)]">{data.rhc_id}</p>
                <div className="grid gap-3 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-5">
                  <p><span className="font-bold">Verified holder:</span> {data.display_name}</p>
                  <p><span className="font-bold">Verification status:</span> {data.verification_status}</p>
                  <p><span className="font-bold">Issued:</span> {data.issued_at ? new Date(data.issued_at).toLocaleDateString() : 'Available'}</p>
                </div>
                <p className="text-sm leading-6 text-[var(--rhc-muted)]">
                  This public lookup confirms only the RHC Digital ID validity state. It does not expose address,
                  birthday, phone, email, private documents, wallet data, property title, or blockchain ownership.
                </p>
              </div>
            ) : (
              <EmptyState title={`Digital ID ${data.status.toLowerCase()}`} description={data.message || 'This reference could not be verified as active.'} />
            )
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Web3Button href="/login">Customer login</Web3Button>
            <Web3Button href="/" variant="secondary">Back to home</Web3Button>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
