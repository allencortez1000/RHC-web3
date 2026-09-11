import { Badge, Card, Web3Shell } from '@rhc/ui';

export default function Page() {
  return (
    <Web3Shell>
      <section className="mx-auto max-w-4xl px-6 py-10">
        <Badge tone="info">Customer Portal</Badge>
        <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Forgot Password</h1>
        <Card className="mt-8">
          <p className="text-base leading-7 text-slate-300">Forgot Password is connected to the Month 1 API contract and designed for validation, error, loading, and empty states.</p>
        </Card>
      </section>
    </Web3Shell>
  );
}
