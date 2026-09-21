'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Card, EmptyState, ResourceStatus, Web3Button } from '@rhc/ui';
import { PublicShell } from '../../../components/meridian-public/public-shell';

type VerificationResult = {
  valid: boolean;
  status: 'VALID' | 'INVALID' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED' | 'INACTIVE';
  rhc_id?: string;
  display_name?: string;
  verification_status?: string;
  issued_at?: string;
  message?: string;
  issuer?: string;
  credential_status?: string;
  business_review?: string;
  blockchain_status?: string;
  source_version?: number;
  what_this_proves?: string;
};


export default function VerifyRhcIdPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VerificationResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const demoMode = process.env.NEXT_PUBLIC_RHC_DATA_MODE === 'demo';
    const apiUrl = demoMode
      ? process.env.NEXT_PUBLIC_RHC_DEMO_HUB_URL || 'http://127.0.0.1:3002/api/demo'
      : process.env.NEXT_PUBLIC_API_URL;
    setLoading(true);
    setError('');
    if (!apiUrl) {
      setError('Verification is unavailable because the live API is not configured.');
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
    <PublicShell current="verification">
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <Card title="Public Verification Result">
          <ResourceStatus loading={loading} error={error} reload={() => window.location.reload()} />
          {data && (
            data.status !== 'INVALID' ? (
              <div className="grid gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge tone={data.status === 'VALID' ? 'success' : data.status === 'REVOKED' ? 'danger' : 'warning'}>{data.status}</Badge>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">Public minimum disclosure</span>
                </div>
                {data.rhc_id ? <p className="font-mono text-2xl font-black text-[var(--rhc-heading)]">{data.rhc_id}</p> : null}
                <dl className="grid gap-3 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-5 sm:grid-cols-2">
                  {[
                    ['Masked holder', data.display_name],
                    ['Issuer', data.issuer],
                    ['Business verification', data.verification_status || data.business_review],
                    ['Credential state', data.credential_status || data.status],
                    ['Source version', data.source_version ? `Version ${data.source_version}` : undefined],
                    ['Issued', data.issued_at ? new Date(data.issued_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : undefined],
                    ['Blockchain status', data.blockchain_status?.replaceAll('_', ' ') || 'Not requested'],
                  ].filter((item) => item[1]).map(([label, value]) => (
                    <div key={label}><dt className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--rhc-muted)]">{label}</dt><dd className="mt-1 font-semibold text-[var(--rhc-heading)]">{value}</dd></div>
                  ))}
                </dl>
                <div className="rounded-2xl border-l-4 border-[var(--rhc-primary)] bg-[var(--rhc-accent-soft)] p-5">
                  <p className="font-bold text-[var(--rhc-heading)]">What this proves</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--rhc-secondary-text)]">{data.what_this_proves || 'This result confirms only the stated RHC record and current credential lifecycle state.'}</p>
                </div>
                {data.message ? <p className="text-sm text-[var(--rhc-muted)]">{data.message}</p> : null}
                <p className="text-sm leading-6 text-[var(--rhc-muted)]">
                  This public lookup does not expose address, birthday, phone, email, private documents, payment amounts, wallet data, property title, or blockchain ownership.
                </p>
              </div>
            ) : (
              <EmptyState title="Verification reference not found" description={data.message || 'This reference could not be verified.'} />
            )
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Web3Button href="/login">Customer login</Web3Button>
            <Web3Button href="/" variant="secondary">Back to home</Web3Button>
          </div>
        </Card>
      </section>
    </PublicShell>
  );
}
