'use client';

import type { Web3ReadResult } from '@rhc/types';
import { Card, ResourceStatus, Web3ReadPanel, useResource } from '@rhc/ui';
import { useAdminCapabilities } from '../admin-capabilities';
import { globalScope, hasEffectiveGrant } from '../capability-scopes';

function IntegrationReadResult() {
  const resource = useResource<Web3ReadResult>('/admin/integrations/thirdweb');
  return (
    <Card title="Thirdweb read-only integration" className="mb-5">
      <p className="mb-4 text-sm text-[var(--rhc-muted)]">
        Configuration and read outcomes are reported separately. An integration record or valid
        configuration alone does not establish provider health or a successful read.
      </p>
      <ResourceStatus {...resource} />
      {resource.data && <Web3ReadPanel result={resource.data} />}
    </Card>
  );
}

export function ThirdwebReadPanel() {
  const capabilities = useAdminCapabilities();
  if (capabilities.loading || capabilities.error) return <ResourceStatus {...capabilities} />;
  if (!capabilities.data?.permissions.includes('integration.view')) return null;
  if (!hasEffectiveGrant(capabilities.data, 'integration.view', globalScope(), false)) {
    return (
      <Card title="Web3 integration access" className="mb-5">
        <p>Global integration.view access is required for server-wide Web3 configuration. Scoped permissions do not grant access to this read.</p>
      </Card>
    );
  }
  return <IntegrationReadResult />;
}
