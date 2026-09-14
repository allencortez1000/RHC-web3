'use client';

import { useId, useState, type FormEvent } from 'react';
import {
  Badge,
  Card,
  DigitalIDCard,
  EmptyState,
  PropertyAssetCard,
  ResourceStatus,
  Web3Button,
  errorMessage,
  isAuthEmailConfirmed,
  isRhcIdEligible,
  usePagedResource,
  useResource,
  useRuntime,
  type Account,
} from '@rhc/ui';

export type Profile = {
  first_name?: string | null;
  last_name?: string | null;
  rhc_id?: string | null;
  [key: string]: unknown;
};
export type Me = { user: Account; profile: Profile | null };
export type Property = {
  id: string;
  property_code: string;
  asset_type: string;
  status: string;
  tower?: string;
  floor?: string;
  unit_number?: string;
  area?: string | number;
  list_price?: string | number;
  currency?: string;
  project?: { project_name?: string; name?: string; company?: { display_name: string } };
};
export type PropertyLink = {
  id: string;
  relationship_type: string;
  status: string;
  property: Property;
};
export type Notification = {
  id: string;
  subject: string;
  body: string;
  channel: string;
  status: string;
  created_at: string;
};
export function fullName(me?: Me) {
  return (
    [me?.profile?.first_name, me?.profile?.last_name].filter(Boolean).join(' ') ||
    me?.user.email ||
    'Complete your profile'
  );
}
export function VerificationSummary({ account }: { account: Account }) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
      <h3 className="font-bold text-[var(--rhc-heading)]">Email and business verification</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="inline text-[var(--rhc-muted)]">Email confirmation: </dt>
          <dd className="inline">
            {isAuthEmailConfirmed(account.auth_email_confirmed_at) ? 'Confirmed' : 'Not confirmed'}
          </dd>
        </div>
        <div>
          <dt className="inline text-[var(--rhc-muted)]">Business verification: </dt>
          <dd className="inline">{account.verification_status || 'Not available'}</dd>
        </div>
        <div>
          <dt className="inline text-[var(--rhc-muted)]">Account status: </dt>
          <dd className="inline">{account.account_status || 'Not available'}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-[var(--rhc-muted)]">
        Confirming your email does not approve business verification. New accounts start with
        PENDING business verification and require RHC review. RHC ID issuance requires an ACTIVE
        account, VERIFIED business status, and confirmed email. The API checks eligibility and
        feature availability when you request an ID.
      </p>
    </div>
  );
}

export function IdentityCard() {
  const resource = useResource<Me>('/me');
  return (
    <div>
      <ResourceStatus {...resource} />
      {resource.data && (
        <DigitalIDCard
          name={fullName(resource.data)}
          rhcId={resource.data.profile?.rhc_id}
          verification={`Business: ${resource.data.user.verification_status || 'Not available'}`}
          account={resource.data.user.account_status}
        />
      )}
    </div>
  );
}
export function IdentityDetails() {
  const me = useResource<Me>('/me');
  const id = useResource<{ rhc_id: string | null }>('/me/rhc-id');
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Card title="Digital Identity Details">
      <ResourceStatus {...me} />
      <ResourceStatus {...id} />
      {me.data && id.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Full Name', fullName(me.data)],
              ['RHC ID', id.data.rhc_id || 'Not issued'],
              ['Email', me.data.user.email],
              ['Account Status', me.data.user.account_status || 'Not available'],
              ['Business Verification', me.data.user.verification_status || 'Not available'],
              ['Wallet', 'Coming soon'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"
              >
                <p className="text-sm text-[var(--rhc-muted)]">{label}</p>
                <p className="mt-1 font-bold text-[var(--rhc-heading)]">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--rhc-muted)]">
            An RHC-issued reference, not a government ID, legal title, or blockchain credential.
          </p>
          <VerificationSummary account={me.data.user} />
          <div className="mt-5 flex flex-wrap gap-3">
            {!id.data.rhc_id && (
              <Web3Button
                disabled={busy || !isRhcIdEligible(me.data.user)}
                onClick={async () => {
                  if (busy || !isRhcIdEligible(me.data?.user)) return;
                  setBusy(true);
                  setError('');
                  try {
                    await request('/me/rhc-id', { method: 'POST' });
                    id.reload();
                    me.reload();
                  } catch (cause) {
                    setError(errorMessage(cause));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Issuing…' : 'Issue RHC ID'}
              </Web3Button>
            )}
            <Web3Button
              disabled={busy}
              variant="secondary"
              onClick={() => {
                me.reload();
                id.reload();
              }}
            >
              Refresh eligibility
            </Web3Button>
            <Web3Button href="/profile" variant="secondary">
              Edit profile
            </Web3Button>
            <Web3Button variant="secondary">Download QR</Web3Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
    </Card>
  );
}
export function LinkedProperties({ compact = false }: { compact?: boolean }) {
  const resource = useResource<PropertyLink[]>('/me/properties');
  return (
    <div>
      <ResourceStatus {...resource} />
      {resource.data &&
        (resource.data.length ? (
          <div className={compact ? 'space-y-3' : 'grid gap-4 md:grid-cols-3'}>
            {resource.data.map((link) => (
              <PropertyAssetCard
                key={link.id}
                name={link.property.property_code}
                description={`${link.property.asset_type} · ${link.relationship_type}`}
                status={link.status}
                href={`/properties/${encodeURIComponent(link.property.id)}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No linked properties"
            description="No authorized property relationships are linked to your account."
          />
        ))}
    </div>
  );
}
export function Notifications() {
  const resource = useResource<Notification[]>('/me/notifications');
  return (
    <div className="space-y-3">
      <ResourceStatus {...resource} />
      {resource.data &&
        (resource.data.length ? (
          resource.data.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--rhc-heading)]">{item.subject}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--rhc-muted)]">
                    {item.body}
                  </p>
                  <time className="mt-2 block text-xs" dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>
                <Badge tone="info">{item.status}</Badge>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No notifications"
            description="Account notifications will appear here when available."
          />
        ))}
    </div>
  );
}
const fields = [
  ['first_name', 'First name', 100],
  ['middle_name', 'Middle name', 100],
  ['last_name', 'Last name', 100],
  ['suffix', 'Suffix', 32],
  ['birth_date', 'Birth date', 10],
  ['nationality', 'Nationality', 100],
  ['address_line', 'Address', 255],
  ['barangay', 'Barangay', 120],
  ['city', 'City', 120],
  ['province', 'Province', 120],
  ['postal_code', 'Postal code', 32],
  ['country', 'Country', 80],
] as const;
export function ProfileEditor({ me, saved }: { me: Me; saved: () => void }) {
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const identityNoticeId = useId();
  const identityLocked =
    me.user.verification_status === 'VERIFIED' ||
    me.profile?.verification_status === 'VERIFIED' ||
    Boolean(me.profile?.rhc_id) ||
    Boolean(me.profile?.rhc_id_issued_at);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    // Read-only inputs still enter FormData; approved identities use a contact-only allowlist.
    const body: Record<string, string | null> = {
      mobile_number: String(form.get('mobile_number') || '').trim() || null,
    };
    if (!identityLocked) {
      for (const [key] of fields) {
        body[key] =
          String(form.get(key) || '').trim() || (key === 'country' ? 'Philippines' : null);
      }
    }
    if (!identityLocked && (!body.first_name || !body.last_name)) {
      setError('First and last names are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await request('/me', { method: 'PATCH', body: JSON.stringify(body) });
      saved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {identityLocked && (
        <p id={identityNoticeId} className="mb-4 text-sm text-[var(--rhc-muted)]">
          Your identity details are read-only after business verification approval or RHC ID
          issuance. Changes to your name, birth date, nationality, or address must remain pending
          administrative review. Contact RHC to request a separately reviewed change. You can still
          update your mobile number here.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label, max]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              name={key}
              type={key === 'birth_date' ? 'date' : 'text'}
              required={!identityLocked && (key === 'first_name' || key === 'last_name')}
              readOnly={identityLocked}
              aria-describedby={identityLocked ? identityNoticeId : undefined}
              maxLength={max}
              defaultValue={String(
                me.profile?.[key] || (key === 'country' ? 'Philippines' : ''),
              ).slice(0, key === 'birth_date' ? 10 : undefined)}
              className="mt-2 w-full rounded-lg border p-3 read-only:bg-[var(--rhc-surface-secondary)] read-only:text-[var(--rhc-muted)]"
            />
          </label>
        ))}
        <label className="block text-sm">
          Mobile number
          <input
            name="mobile_number"
            type="tel"
            autoComplete="tel"
            maxLength={16}
            pattern="\+[1-9][0-9]{7,14}"
            title="Use international format, for example +639123456789."
            defaultValue={String(me.profile?.mobile_number || '')}
            className="mt-2 w-full rounded-lg border p-3"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
      <div className="mt-5">
        <Web3Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </Web3Button>
      </div>
    </form>
  );
}

type DirectoryRecord = {
  id: string;
  display_name?: string;
  project_name?: string;
  name?: string;
  service_name?: string;
  description?: string;
  status: string;
  company?: { display_name: string };
};
export function DirectoryCards({ path }: { path: string }) {
  const resource = usePagedResource<DirectoryRecord>(path);
  const [query, setQuery] = useState('');
  const records = resource.data?.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <label className="block text-sm">
        Search directory
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="my-3 w-full rounded-lg border p-3"
        />
      </label>
      <ResourceStatus {...resource} />
      {records &&
        (records.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {records.map((item) => (
              <Card key={item.id} className="p-0">
                <div className="rhc-market-strip h-28" />
                <div className="p-6">
                  <Badge>{item.status}</Badge>
                  <h3 className="mt-4 text-xl font-bold text-[var(--rhc-heading)]">
                    {item.display_name || item.project_name || item.service_name || item.name}
                  </h3>
                  {item.company && (
                    <p className="mt-2 text-sm">Provider: {item.company.display_name}</p>
                  )}
                  <p className="mt-3 text-sm text-[var(--rhc-muted)]">
                    {item.description || 'No description provided.'}
                  </p>
                  <div className="mt-5">
                    <Web3Button variant="secondary">Transactions coming soon</Web3Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No directory records"
            description="No matching records are currently available."
          />
        ))}
      {resource.hasMore && (
        <div className="mt-5">
          <Web3Button disabled={resource.loading} onClick={resource.loadMore} variant="secondary">
            Load more directory records
          </Web3Button>
          <p className="mt-2 text-xs">Search applies to loaded records.</p>
        </div>
      )}
    </>
  );
}
