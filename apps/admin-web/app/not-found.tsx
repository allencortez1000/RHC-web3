import { EmptyState, Web3Button, Web3Shell } from '@rhc/ui';

export default function NotFound() {
  return (
    <Web3Shell variant="admin">
      <section className="mx-auto grid min-h-screen max-w-2xl place-items-center px-6 py-16">
        <EmptyState title="Admin page not found" description="The requested command-center page does not exist or is unavailable for this environment." />
        <div className="mt-6">
          <Web3Button href="/">Return to Command Center</Web3Button>
        </div>
      </section>
    </Web3Shell>
  );
}
