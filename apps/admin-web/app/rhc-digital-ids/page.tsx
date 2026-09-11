import { Badge, Card, EmptyState, Web3Shell } from '@rhc/ui';

export default function Page() {
  return (
    <Web3Shell variant="admin">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <Badge tone="warning">Admin Module</Badge>
        <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">RHC Digital IDs</h1>
        <Card className="mt-8" title="RHC Digital IDs">
          <EmptyState title="RHC Digital IDs" description="Backed by /api/v1/admin endpoints with explicit server-side permissions and audit logging for sensitive changes." />
        </Card>
      </section>
    </Web3Shell>
  );
}
