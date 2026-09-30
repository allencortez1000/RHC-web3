'use client';

import type { Web3ReadResult } from '@rhc/types';
import {
  Card,
  ResourceStatus,
  Web3ReadPanel,
  isAdminAccount,
  useResource,
  useRuntime,
  type Account,
} from '@rhc/ui';

function TokenPreview() {
  const resource = useResource<Web3ReadResult>('/web3/token');
  return (
    <Card title="Read-only Web3 preview" className="mt-7">
      <ResourceStatus {...resource} />
      {resource.data && <Web3ReadPanel result={resource.data} />}
    </Card>
  );
}

function VerifiedCustomerPreview() {
  const account = useResource<{ authenticated: boolean; user: Account }>('/auth/session');
  if (account.loading || account.error) return <ResourceStatus {...account} />;
  // Public roadmap routes do not populate the runtime account on a direct visit.
  // Verify the application account before mounting any token resource reader.
  if (!account.data?.authenticated || !account.data.user?.id ||
      account.data.user.account_status !== 'ACTIVE' || isAdminAccount(account.data.user)) return null;
  return <TokenPreview />;
}

export function CustomerWeb3Preview() {
  const { hasSession } = useRuntime();
  return hasSession ? <VerifiedCustomerPreview /> : null;
}
