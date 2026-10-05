'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Card, EmptyState, ResourceStatus, Web3Button, errorMessage, useRuntime } from '@rhc/ui';
import { PublicShell } from '../../../components/meridian-public/public-shell';

type VerificationResult = {
  valid: boolean;
  status: 'VALID' | 'INVALID' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED' | 'INACTIVE' | 'UNAVAILABLE';
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


function VerificationResultPage({ token }: { token: string }) {
  const [data, setData] = useState<VerificationResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { publicRequest, dataMode } = useRuntime();
  const demoMode = dataMode === 'demo';
  let legacyIdentifier = false;
  try { legacyIdentifier = /^RHC-/.test(atob(token.replace(/-/g, '+').replace(/_/g, '/'))); } catch { /* Opaque references need not be base64. */ }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(undefined);
    setLoading(true);
    setError('');
    if (legacyIdentifier) {
      setData({ valid: false, status: 'UNAVAILABLE', message: 'No identifier was looked up and no customer identity data is displayed.' });
      setLoading(false);
      return;
    }
    publicRequest<VerificationResult>('/verify/rhc-id/' + encodeURIComponent(token), {
      cache: 'no-store', signal: controller.signal,
    })
      .then((result) => {
        if (!result || !['VALID', 'INVALID', 'PENDING', 'EXPIRED', 'REVOKED', 'SUPERSEDED', 'INACTIVE', 'UNAVAILABLE'].includes(result.status)) throw new Error('Verification returned an unsupported result.');
        if (active) setData(result);
      })
      .catch((cause) => { if (active) setError(errorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [token, publicRequest, legacyIdentifier]);

  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <Card title={data?.status === 'UNAVAILABLE' ? 'Public Verification Unavailable' : 'Public Verification Result'}>
          <Badge tone={demoMode ? 'warning' : 'info'}>{demoMode ? 'Synthetic demo verification' : 'API verification'}</Badge>
          <ResourceStatus loading={loading} error={error} reload={() => window.location.reload()} />
          {!loading && !error && data && (
            data.status === 'UNAVAILABLE' ? (
              <EmptyState title="Public verification is not active" description={data.message || 'An approved protected public sharing contract is not available. No identity is disclosed.'} />
            ) : data.status !== 'INVALID' ? (
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

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const { dataMode, dataRevision } = useRuntime();
  return <VerificationResultPage key={[token, dataMode, dataRevision].join(':')} token={token} />;
}
