import { AppShell } from '@rhc/ui';
import { navFor } from '../web3-nav';
import { PointsReadOnlyPanel } from '../components/points-readonly/PointsReadOnlyPanel';

// Keep this route passive until the shared Points contract is approved.
// Do not restore demo-record reads, redemption handlers, or guessed API routes.
export default function Page() {
  return (
    <AppShell title="RHC Points & Rewards" navItems={navFor('RHC Points')}>
      <PointsReadOnlyPanel />
    </AppShell>
  );
}