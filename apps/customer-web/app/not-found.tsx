import { EmptyState, Web3Button, Web3Shell } from '@rhc/ui';

export default function NotFound() {
  return (
    <Web3Shell>
      <section className="mx-auto grid min-h-screen max-w-2xl place-items-center px-6 py-16">
        <EmptyState title="Page not found" description="The page you requested does not exist or is not available in the RHC Digital customer portal." />
        <div className="mt-6">
          <Web3Button href="/dashboard">Return to Dashboard</Web3Button>
        </div>
      </section>
    </Web3Shell>
  );
}
