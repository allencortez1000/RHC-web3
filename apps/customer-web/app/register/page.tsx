import { Badge, Card, Web3Button, Web3Shell } from '@rhc/ui';

export default function Page() {
  return (
    <Web3Shell>
      <section className="mx-auto max-w-4xl px-6 py-10">
        <Badge tone="gold">RHC Web3 Platform</Badge>
        <h1 className="rhc-page-title mt-5">Register</h1>
        <Card className="mt-8 rhc-card-token">
          <p className="rhc-body-copy">Registration is prepared for the Month 1 API contract and future identity verification, validation, loading, and error states.</p>
          <div className="mt-6"><Web3Button href="/login" variant="secondary">Back to Sign In</Web3Button></div>
        </Card>
      </section>
    </Web3Shell>
  );
}
