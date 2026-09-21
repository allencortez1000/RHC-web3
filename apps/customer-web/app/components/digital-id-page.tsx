'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  AppShell,
  Badge,
  Card,
  DigitalIDCard,
  EmptyState,
  ResourceStatus,
  Web3Button,
  errorMessage,
  isAuthEmailConfirmed,
  isRhcIdEligible,
  useResource,
  useRuntime,
} from '@rhc/ui';
import { navFor } from '../web3-nav';
import { LinkedProperties, fullName, type Me, type PropertyLink } from './customer-data';

function maskedReference(value?: string | null) {
  if (!value) return 'Not issued';
  const parts = value.split('-');
  return parts.length >= 3 ? `${parts[0]}-${parts[1]}-${parts[2].slice(0, 4)}••••` : value;
}

function verificationToken(rhcId?: string | null, publicReference?: string | null) {
  if (publicReference) return publicReference;
  if (!rhcId || typeof window === 'undefined') return null;
  return window.btoa(rhcId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function VerificationQr({ token }: { token?: string | null }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    if (!token) {
      setSource('');
      return;
    }
    const verificationUrl = `${window.location.origin}/verify/rhc-id/${encodeURIComponent(token)}`;
    QRCode.toDataURL(verificationUrl, {
      width: 224,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#07111F', light: '#FFFFFF' },
    })
      .then((value) => {
        if (active) setSource(value);
      })
      .catch(() => {
        if (active) setSource('');
      });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <div className="grid h-56 w-56 shrink-0 place-items-center rounded-2xl border border-[var(--rhc-border)] bg-white p-3 shadow-sm">
      {source ? (
        <Image src={source} width={200} height={200} unoptimized alt="QR code for the privacy-safe RHC verification page" className="h-full w-full" />
      ) : (
        <div className="grid h-full w-full place-items-center rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs font-bold text-slate-500">
          Verification QR appears after credential issuance
        </div>
      )}
    </div>
  );
}

export function DigitalIdPage() {
  const me = useResource<Me>('/me');
  const properties = useResource<PropertyLink[]>('/me/properties');
  const id = useResource<{ rhc_id: string | null; public_reference?: string | null }>('/me/rhc-id');
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const account = me.data?.user;
  const profile = me.data?.profile;
  const rhcId = id.data?.rhc_id || profile?.rhc_id;
  const token = verificationToken(rhcId, id.data?.public_reference);
  const eligible = isRhcIdEligible(account);
  const reviewable = ['UNVERIFIED', 'REJECTED'].includes(account?.verification_status || '');

  async function submitReview() {
    if (!reviewable || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/me/identity-review', {
        method: 'POST',
        body: JSON.stringify({ idempotency_key: `identity-review-${crypto.randomUUID()}` }),
      });
      me.reload();
      setMessage('Synthetic identity review submitted. A different authorized actor must review it.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function issue() {
    if (!eligible || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/me/rhc-id', { method: 'POST' });
      id.reload();
      me.reload();
      setMessage('RHC Digital ID issued successfully.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const checks = [
    ['Email confirmation', isAuthEmailConfirmed(account?.auth_email_confirmed_at), 'Required before business approval.'],
    ['Active account', account?.account_status === 'ACTIVE', 'Your customer account must be active.'],
    ['Business verified', account?.verification_status === 'VERIFIED', 'RHC review must approve business verification.'],
    ['RHC ID issued', Boolean(rhcId), 'Issued only after all eligibility checks pass.'],
  ] as const;

  return (
    <AppShell title="RHC Digital ID" navItems={navFor('RHC Digital ID')}>
      <section className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
        <div className="grid gap-5">
          <ResourceStatus {...me} />
          <ResourceStatus {...id} />
          {me.data && (
            <DigitalIDCard
              name={fullName(me.data)}
              rhcId={rhcId}
              verification={`Business: ${account?.verification_status || 'Not available'}`}
              account={account?.account_status || 'Not available'}
            />
          )}

          <Card title="Digital ID Actions">
            <p className="text-sm leading-6 text-[var(--rhc-muted)]">
              Your RHC Digital ID is an internal ecosystem reference. It is not a government ID,
              property title, investment product, wallet private key, or blockchain credential.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!rhcId && reviewable ? (
                <Web3Button disabled={busy} onClick={submitReview}>
                  {busy ? 'Submitting…' : 'Submit identity review'}
                </Web3Button>
              ) : null}
              {!rhcId && eligible ? (
                <Web3Button disabled={busy} onClick={issue}>
                  {busy ? 'Issuing…' : 'Issue RHC Digital ID'}
                </Web3Button>
              ) : null}
              {!rhcId && account?.verification_status === 'PENDING' ? (
                <Badge tone="warning">Business review pending</Badge>
              ) : null}
              <Web3Button
                variant="secondary"
                onClick={() => {
                  me.reload();
                  id.reload();
                  properties.reload();
                }}
              >
                Refresh status
              </Web3Button>
              <Web3Button href="/profile" variant="secondary">
                Update profile
              </Web3Button>
            </div>
            {message && <p role="status" className="mt-4">{message}</p>}
            {error && <p role="alert" className="mt-4">{error}</p>}
          </Card>
        </div>

        <div className="grid gap-5">
          <Card className="rhc-card-token" title="Verification Reference">
            <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
              <VerificationQr token={token} />
              <div>
                <Badge tone={rhcId ? 'gold' : 'neutral'}>{rhcId ? 'Issued' : 'Pending issuance'}</Badge>
                <p className="mt-4 font-mono text-xl font-black text-[var(--rhc-heading)]">{maskedReference(rhcId)}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">
                  The QR-style reference resolves through RHC systems and contains only a verification
                  reference, not address, birthday, phone, email, wallet, or private profile data.
                </p>
                {token && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Web3Button href={`/verify/rhc-id/${encodeURIComponent(token)}`} variant="secondary">Open public verification</Web3Button>
                    <Web3Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(String(rhcId));
                          setMessage('RHC Digital ID copied.');
                        } catch {
                          setError('The Digital ID could not be copied from this browser.');
                        }
                      }}
                    >
                      Copy RHC ID
                    </Web3Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card title="Eligibility Checklist">
            <div className="grid gap-3">
              {checks.map(([label, ok, detail]) => (
                <div key={label} className="flex gap-3 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${ok ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]' : 'bg-[var(--rhc-surface)] text-[var(--rhc-muted)]'}`}>
                    {ok ? '✓' : '•'}
                  </span>
                  <div>
                    <p className="font-bold text-[var(--rhc-heading)]">{label}</p>
                    <p className="mt-1 text-sm text-[var(--rhc-muted)]">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card title="Linked Property Access">
          <ResourceStatus {...properties} />
          {properties.data && (
            properties.data.length ? (
              <LinkedProperties compact />
            ) : (
              <EmptyState title="No linked properties" description="Authorized RHC customer-property relationships will appear here." />
            )
          )}
        </Card>

        <Card title="Security & Privacy Boundaries">
          <div className="grid gap-3">
            {[
              ['Off-chain personal records', 'Personal data, contracts, payments, and documents remain in secured RHC systems.'],
              ['Company-scoped sharing', 'Participating companies receive only the minimum verified data required for an approved service.'],
              ['Blockchain-ready, not blockchain-first', 'Future blockchain verification should use hashes or references, not raw personal data.'],
              ['No custody', 'The RHC Digital ID does not store or control crypto private keys.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                <p className="font-bold text-[var(--rhc-heading)]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
