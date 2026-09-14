'use client';

import { useState, type FormEvent } from 'react';
import { Card, ResourceStatus, Web3Button, errorMessage, usePagedResource, useResource, useRuntime } from '@rhc/ui';

type Policy = { consent_type: string; purpose: string; description: string; required: boolean; company_required: boolean };
type Consent = {
  id: string;
  consent_type: string;
  purpose: string | null;
  consent_version: string;
  company_id: string | null;
  company: { display_name: string; status: string } | null;
  granted: boolean;
  granted_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
};
type Company = { id: string; display_name: string; status: string };
const labels: Record<string, string> = {
  PRIVACY_POLICY: 'Privacy policy', TERMS: 'Terms of use', MARKETING: 'Marketing communications',
  DATA_SHARING: 'Company data sharing', COMPANY_SERVICE: 'Company services',
};

function ConsentForm({ policies, optional, setMessage }: { policies: Policy[]; optional: boolean; setMessage: (message: string) => void }) {
  const { request } = useRuntime();
  const [type, setType] = useState(policies[0].consent_type);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const policy = policies.find((item) => item.consent_type === type)!;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setMessage('');
    try {
      await request('/me/consents', { method: 'POST', body: JSON.stringify({
        consent_type: policy.consent_type, purpose: policy.purpose,
        consent_version: String(form.get('consent_version')).trim(),
        company_id: policy.company_required ? String(form.get('company_id')) : null,
        granted: form.get('decision') === 'grant',
      }) });
      setMessage('Consent decision saved. Previous decisions remain in your history.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return (
    <Card title={optional ? 'Optional permissions' : 'Required account policies'}>
      <p className="mb-4 text-sm text-[var(--rhc-muted)]">
        {optional
          ? 'Marketing, company data sharing, and company services are separate, optional choices. None is selected on your behalf. Each company permission applies only to the company you choose.'
          : 'Privacy policy and terms acceptance are separate from optional permissions. Record each policy explicitly; the registration checkbox is not a versioned consent record. Withdrawing here records your decision but does not close your account. Contact RHC about account closure or data rights.'}
      </p>
      <form onSubmit={submit} className="space-y-4">
        <fieldset key={type} disabled={busy} className="space-y-4">
          <label className="block text-sm">{optional ? 'Optional permission' : 'Account policy'}
            <select value={type} onChange={(event) => { setType(event.target.value); setError(''); setMessage(''); }} className="mt-2 w-full rounded-lg border p-3">
              {policies.map((item) => <option key={item.consent_type} value={item.consent_type}>{labels[item.consent_type]}</option>)}
            </select>
          </label>
          <p className="text-sm">Purpose: {policy.description}</p>
          {policy.company_required && <CompanySelection />}
          <label className="block text-sm">Policy version reviewed
            <input name="consent_version" required maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9._:\-]*" placeholder="Enter the version from the policy you reviewed" className="mt-2 w-full rounded-lg border p-3" />
          </label>
          <p className="text-xs text-[var(--rhc-muted)]">Use the version supplied with the policy, not today’s date unless that is its published version. If you have not received the policy, request it from RHC before granting permission.</p>
          <label className="block text-sm">Consent decision
            <select name="decision" required defaultValue="" className="mt-2 w-full rounded-lg border p-3">
              <option value="" disabled>Choose a decision</option>
              <option value="grant">{optional ? 'Grant permission' : 'Accept policy'}</option>
              <option value="withdraw">Withdraw consent</option>
            </select>
          </label>
          <Web3Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save consent decision'}</Web3Button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
    </Card>
  );
}

function CompanySelection() {
  const companies = usePagedResource<Company>('/companies');
  return (
    <div>
      <ResourceStatus {...companies} />
      <label className="block text-sm">Company
        <select name="company_id" required defaultValue="" className="mt-2 w-full rounded-lg border p-3">
          <option value="" disabled>Choose an active company</option>
          {companies.data?.filter((company) => company.status === 'ACTIVE').map((company) => <option key={company.id} value={company.id}>{company.display_name}</option>)}
        </select>
      </label>
      {companies.hasMore && <Web3Button type="button" variant="secondary" disabled={companies.loading} onClick={companies.loadMore}>Load more companies</Web3Button>}
      <p className="mt-2 text-xs">To withdraw from an inactive company, use its decision in the history below.</p>
    </div>
  );
}

export function ConsentPreferences() {
  const [skip, setSkip] = useState(0);
  const resource = useResource<{ policies: Policy[]; records: Consent[] }>(`/me/consents?take=20&skip=${skip}`);
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function withdraw(record: Consent) {
    if (busy) return;
    const policy = resource.data?.policies.find((item) => item.consent_type === record.consent_type);
    if (!policy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await request('/me/consents', { method: 'POST', body: JSON.stringify({
        consent_type: record.consent_type, purpose: policy.purpose, consent_version: record.consent_version,
        company_id: record.company_id, granted: false,
      }) });
      setSkip(0);
      setMessage('Withdrawal recorded. Historical grants are retained, not reactivated.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return (
    <section className="mt-5 space-y-4" aria-label="Privacy and consent">
      <h2 className="text-xl font-bold">Privacy and consent</h2>
      <ResourceStatus {...resource} />
      {resource.data && <>
        <div className="grid gap-4 lg:grid-cols-2">
          <ConsentForm policies={resource.data.policies.filter((item) => item.required)} optional={false} setMessage={setMessage} />
          <ConsentForm policies={resource.data.policies.filter((item) => !item.required)} optional setMessage={setMessage} />
        </div>
        <Card title="Consent history">
          <p className="mb-4 text-sm text-[var(--rhc-muted)]">Newest decisions first. Entries are historical evidence, not a list of current permissions. The latest decision for each purpose and company supersedes earlier decisions, including earlier policy versions.</p>
          {!resource.data.records.length && <p>No consent decisions recorded.</p>}
          <ul className="space-y-3">
            {resource.data.records.map((record) => <li key={record.id} className="rounded-lg border p-4">
              <h3 className="font-semibold">{labels[record.consent_type] || record.consent_type} — {record.granted ? 'Granted' : 'Withdrawn'}</h3>
              <p className="text-sm">{record.company?.display_name || record.company_id || 'RHC account'} · Policy version: {record.consent_version}</p>
              <p className="text-sm">Purpose: {record.purpose || 'Not recorded in this historical entry'}</p>
              <p className="text-sm">Recorded: <time dateTime={record.created_at}>{new Date(record.created_at).toLocaleString()}</time></p>
              <p className="text-sm">{record.granted ? 'Granted at' : 'Withdrawn at'}: {record.granted_at || record.withdrawn_at || 'Not recorded'}</p>
              {record.granted && <Web3Button type="button" variant="secondary" disabled={busy} onClick={() => withdraw(record)}>Withdraw {labels[record.consent_type] || record.consent_type}{record.company ? ` for ${record.company.display_name}` : ''}</Web3Button>}
            </li>)}
          </ul>
          <div className="mt-4 flex gap-3">
            <Web3Button variant="secondary" disabled={skip === 0 || resource.loading || busy} onClick={() => setSkip(Math.max(0, skip - 20))}>Newer decisions</Web3Button>
            <Web3Button variant="secondary" disabled={resource.data.records.length < 20 || resource.loading || busy || skip >= 100000} onClick={() => setSkip(skip + 20)}>Older decisions</Web3Button>
          </div>
        </Card>
      </>}
      {error && <p role="alert" className="mt-3">{error}</p>}
      {message && <p role="status" className="mt-3">{message}</p>}
    </section>
  );
}
