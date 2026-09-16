'use client';

import { useState } from 'react';
import { AppShell, Badge, Card, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';


const highlights = [
  ['Version', '1.0'],
  ['Pilot', 'Amica Residences Tower 1'],
  ['Status', 'Compliance-first foundation'],
  ['Token', 'Not publicly issued'],
];

const principles = [
  'Identity first',
  'Business utility second',
  'Verification third',
  'Blockchain where useful',
  'Token only when justified',
];

const sections = [
  {
    title: '1. Executive Summary',
    paragraphs: [
      'Rabino Holdings Corporation (RHC) has an opportunity to build a digital operating layer that connects its real estate, construction, utility, retail, security, media, food, and future business activities under one customer identity and one governed technology platform. The Rabino Web3 Ecosystem is not designed as a speculative cryptocurrency project. Its purpose is to create practical digital utility from existing and future RHC businesses, while using blockchain selectively for tamper-evident verification where immutability and independent proof add measurable value.',
      'The Phase 1 platform is centered on four foundations: RHC Digital ID, the RHC customer account or wallet, RHC Rewards, and RHC Verify. Sensitive information remains in secured off-chain systems. Blockchain, when activated, receives only approved cryptographic hashes and non-sensitive references.',
      'The first pilot is Amica Residences Tower 1, a 10-storey condominium project with two basement parking floors, 288 residential units, 16 commercial units and 112 parking slots.',
      'A central design principle is regulatory separation. Under this whitepaper, RHC Rewards are initially designed as centrally managed loyalty or utility points rather than a publicly traded crypto-asset. No ICO, token presale, public token sale, guaranteed appreciation, staking, lending, tokenized company ownership, tokenized condominium title, crypto exchange, or customer crypto custody is authorized.',
    ],
  },
  {
    title: '2. Strategic Context and Vision',
    paragraphs: [
      'RHC is positioned differently from a start-up whose only product is a token. The group already has or plans operating businesses that touch property development, construction, utilities, commerce, customer communications, security and other recurring services.',
      'The strategic vision is: ONE RHC ACCOUNT, ONE DIGITAL ID, ONE ECOSYSTEM. The identity layer becomes the connective tissue; the rewards layer encourages repeat use; and the verification layer supports trust.',
      'Web3 is used as an architectural toolset, not as a business objective by itself. The ecosystem should remain usable by customers who do not understand wallets, private keys, gas fees or block explorers.',
    ],
    bullets: [
      'Create one governed digital identity across participating RHC services.',
      'Digitize the Amica buyer journey from reservation through turnover.',
      'Establish a transparent rewards ledger linked to real customer activity.',
      'Create tamper-evident proof for selected approved documents and project events.',
      'Preserve regulatory flexibility by keeping crypto-asset functionality disabled until separately approved.',
    ],
  },
  {
    title: '3. Corporate Ecosystem',
    paragraphs: [
      'Rabino Holdings Corporation acts as the strategic ecosystem lead and governance center. Participating corporations remain separate legal entities with their own contracts, accounting, permits, tax obligations, liabilities and regulatory responsibilities.',
      'The digital platform connects authorized data and customer experiences through defined interfaces; it does not merge corporate personalities or automatically transfer obligations from one company to another.',
    ],
    bullets: [
      'Rabino Holdings Corporation — ecosystem governance, standards, shared identity and platform strategy.',
      'Amica Condominium Realty Corporation — property inventory, reservations, buyer records, contracts, certificates and turnover.',
      'Rabino Home Builders Corporation — construction milestones, project verification and contractor-related records.',
      'Amica Water Co. Ltd. — customer account linkage, utility service status and eligible rewards.',
      'Amica Mart Trading Corporation — retail purchases, loyalty earning and redemption use cases.',
      'Rabino Broadcasting and Advertising Corporation — customer communications, campaigns and approved promotional engagement.',
      'Rabino Security Services Corporation — authorized resident or visitor credentials and security system integration.',
      'Coastline Food Corporation — future commerce, loyalty and partner participation.',
    ],
  },
  {
    title: '4. Amica Residences Tower 1 Pilot',
    paragraphs: [
      'Amica Residences Tower 1 is the recommended pilot because it provides a complete, high-value customer lifecycle and clear records that benefit from digitization.',
      'The pilot must not represent blockchain records as legal title. Government-issued or legally required instruments remain governed by applicable Philippine law and registration procedures. RHC Verify provides supplementary evidence that an RHC-issued digital certificate or approved record matches the company official system.',
    ],
    bullets: [
      'Registration — create account, verify mobile/email, issue RHC Digital ID.',
      'Unit Selection — display available inventory from the authoritative property database.',
      'Reservation — create controlled reservation with expiry and audit trail.',
      'Contract — link approved contract metadata and secure document copy.',
      'Payments — record verified payment milestones and official references.',
      'Rewards — credit eligible activity under approved rules.',
      'Certificates — issue QR-verifiable RHC/Amica digital certificate.',
      'Turnover — record turnover status and continuing service links.',
    ],
  },
  {
    title: '5. RHC Digital ID',
    paragraphs: [
      'RHC Digital ID is the identity foundation of the ecosystem. It is an RHC-issued customer identifier, not a government identification document and not a blockchain wallet address.',
      'A suggested public format is RHC-YYYY-XXXXXXXX. Internally, the database should use a UUID or ULID as the true primary key. The public identifier must not encode birth date, government ID number or other sensitive data.',
      'Authentication should support modern security controls including strong passwords or passkeys, multi-factor authentication for administrators, device/session management, step-up authentication for sensitive actions and eventual WebAuthn/FIDO2 capability.',
    ],
  },
  {
    title: '6. RHC Wallet and Customer Account',
    paragraphs: [
      'Under Phase 1, the RHC Wallet is a secured customer account interface containing digital identity, property records, payment status, documents, rewards and digital credentials. It is not a crypto custody account and does not hold customer private keys.',
      'The customer dashboard should provide a simple home screen containing RHC Digital ID, linked properties, payment status, RHC Rewards balance, documents, certificates, notifications and participating services.',
      'Future external wallet linking can be added only after separate approval. RHC must never store customer seed phrases.',
    ],
  },
  {
    title: '7. RHC Rewards Economics',
    paragraphs: [
      'RHC Rewards are the initial economic engagement layer. Their function is to encourage legitimate customer activity within the RHC ecosystem rather than to create speculative investment demand.',
      'In Phase 1, RHC Rewards should operate as centrally administered points with configurable rules. Every credit, redemption, reversal, expiry and adjustment must be recorded in an immutable application ledger with source company, rule, reference and authorization.',
      'RHC Rewards should not automatically be transferable between customers, externally tradable, redeemable for fiat cash, marketed as an investment, linked to profit-sharing, represented as shares, or described as appreciating because RHC grows.',
    ],
  },
  {
    title: '8. Blockchain Architecture',
    paragraphs: [
      'The proposed blockchain strategy is hybrid, chain-agnostic and verification-first. RHC should not build a proprietary blockchain in the initial phases.',
      'Blockchain is most useful where an approved record benefits from independent proof that it existed in a specific form at a particular time. The platform can calculate a SHA-256 hash of an approved document or canonical event, store that hash internally, then submit the hash to a registry smart contract.',
      'Sensitive customer information should never be placed directly on a public blockchain. On-chain data should consist of non-sensitive hashes, record types, pseudonymous references and status events.',
    ],
  },
  {
    title: '9. Data Privacy and Information Governance',
    paragraphs: [
      'The ecosystem will process personal information and must be designed around the Philippine Data Privacy Act of 2012 and its implementing rules.',
      'Privacy by design should begin with data mapping. RHC must identify what information each module collects, the purpose, legal basis, source, storage location, access groups, retention period, sharing arrangements and deletion or archival rule.',
      'Public certificate verification pages should mask customer identities by default. Logs should not contain passwords, OTP values, authentication tokens, private keys or unnecessary personal data.',
    ],
  },
  {
    title: '10. Cybersecurity and Operational Resilience',
    paragraphs: [
      'The ecosystem combines property, payment status, identity, documents, rewards and blockchain verification, making security a core business requirement.',
      'The baseline model is Zero Trust and least privilege. Every request is authenticated and authorized according to user, role, company, project and context. Administrative access requires MFA.',
      'Operational resilience requires tested backups and recovery. A backup is not considered valid until it has been restored successfully.',
    ],
  },
  {
    title: '11. Governance and Operating Model',
    paragraphs: [
      'Technology governance must reflect the fact that the ecosystem spans multiple companies and potentially regulated activities. Developers should implement approved rules, not invent them.',
      'A recommended RHC Digital Assets & Web3 Committee sits under the RHC Board or executive management. It should approve strategic direction, high-risk functionality, blockchain network selection, smart-contract changes, rewards policy, partner integrations and any proposal to introduce a crypto-asset.',
    ],
  },
  {
    title: '12. Philippine Regulatory Framework',
    paragraphs: [
      'The regulatory framework is activity-based. Calling a product Web3, rewards, utility token or digital certificate does not by itself determine the legal result.',
      'Phase 1 deliberately avoids functions that would prematurely move the platform into a Crypto-Asset Service Provider operating model. Any future token proposal must be analyzed against SEC, BSP, AMLC, NPC, tax and other applicable requirements at the time of launch.',
    ],
  },
  {
    title: '13. Token Restrictions and Compliance Boundaries',
    paragraphs: [
      'The most important control in Version 1.0 is that no public crypto-asset is authorized. The technology team should be technically incapable of accidentally launching investment functionality because the relevant feature flags, contracts and operational procedures do not exist in the initial release.',
    ],
    bullets: [
      'Public token sale — prohibited.',
      'ICO or presale — prohibited.',
      'External token trading — disabled.',
      'Customer-to-customer token transfer — disabled.',
      'Crypto exchange — prohibited.',
      'Customer crypto custody — prohibited.',
      'Staking or yield — prohibited.',
      'Tokenized RHC equity and tokenized condominium title — prohibited.',
      'Document hash anchoring — permitted after approval.',
      'Digital certificates and centralized rewards points — permitted subject to terms.',
    ],
  },
  {
    title: '14. Product and Technology Roadmap',
    paragraphs: [
      'The roadmap separates business digitization from Web3 expansion so that RHC can generate value before taking on crypto-specific complexity.',
    ],
    bullets: [
      'Phase 1: Foundation — RHC Digital ID, customer portal, property registry, reservations, payment status, documents, centralized rewards, admin and audit.',
      'Phase 2: Verification — blockchain gateway, hashes, certificates, QR verification and approved project milestones.',
      'Phase 3: Ecosystem — Amica Water, Amica Mart, RHBC, RSSC, RBAC and other company integrations.',
      'Phase 4: Token Decision — legal/regulatory classification, business case, token economics, board approval and security design.',
      'Phase 5: Expansion — partners, mobile app, wider projects and approved digital-asset functions.',
    ],
  },
  {
    title: '15. Risk Management Framework',
    paragraphs: [
      'The ecosystem introduces strategic, regulatory, technology, privacy, security, operational, financial and reputational risks. RHC should maintain a formal risk register with owner, probability, impact, mitigation, trigger and residual risk rating.',
      'A special risk is regulatory drift: a product can begin as limited rewards and gradually add transferability, external trading, fiat conversion and speculative marketing until it becomes materially different from the approved model.',
    ],
  },
  {
    title: '16. Future Rabino Utility Token',
    paragraphs: [
      'A future Rabino Utility Token may be considered only when RHC has a demonstrated use case that cannot be served adequately by centralized RHC Rewards. Web3 branding or the possibility of price appreciation is not a sufficient business case.',
      'The token should not automatically represent shares of RHC, ownership of a condominium unit, profit participation or guaranteed return.',
    ],
  },
  {
    title: '17. Economic and Strategic Value Creation',
    paragraphs: [
      'The ecosystem can create value even without token price appreciation. The most defensible benefits come from lower operational friction, stronger customer retention, better data quality, cross-company customer acquisition, reduced document disputes, more efficient verification and improved visibility into customer lifecycle value.',
      'Blockchain adds strategic value only when verification matters, such as anchoring an approved project milestone, digital certificate or document hash without disclosing the source document.',
    ],
  },
  {
    title: '18. Implementation Principles and Success Metrics',
    paragraphs: [
      'The implementation should start with a production-grade MVP for Amica Residences Tower 1 rather than a broad group-wide launch. The development sequence should prioritize security, identity, property, reservations, payments, documents, rewards, certificates, audit and only then blockchain.',
      'Technical definition of done must include automated testing, role validation, audit events, error handling, documentation and UAT — not merely a working screen.',
    ],
  },
  {
    title: '19. Conclusion',
    paragraphs: [
      'The Rabino Web3 Ecosystem should be built as a long-term digital operating layer for Rabino Holdings Corporation, not as a stand-alone cryptocurrency promotion.',
      'Amica Residences Tower 1 provides the ideal first proof because it contains a complete customer journey and multiple high-value records that benefit from digitization.',
      'The governing principle remains: IDENTITY FIRST. BUSINESS UTILITY SECOND. VERIFICATION THIRD. BLOCKCHAIN WHERE USEFUL. TOKEN ONLY WHEN JUSTIFIED.',
    ],
  },
];

export default function Page() {
  const [selectedSection, setSelectedSection] = useState(0);
  const safeSelectedSection = Math.min(Math.max(selectedSection, 0), sections.length - 1);
  const activeSection = sections[safeSelectedSection] ?? sections[0];
  const [activeNumber, ...activeTitleParts] = activeSection.title.split('. ');

  return (
    <AppShell title="White Paper" navItems={navFor('White Paper')} hideSidebar>
      <div className="mb-5 flex justify-start">
        <Web3Button href="/dashboard" variant="secondary">
          ← Back to Dashboard
        </Web3Button>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-6 shadow-sm md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--rhc-accent-soft)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-[rgba(212,175,55,.08)] blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1.1fr_.9fr] xl:items-center">
          <div>
            <Badge tone="gold">RHC Web3 White Paper</Badge>
            <h2 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] text-[var(--rhc-heading)] md:text-6xl">
              Rabino Web3 Ecosystem
            </h2>
            <p className="mt-4 text-2xl font-bold text-[var(--rhc-primary)]">Whitepaper v1.0</p>
            <p className="rhc-body-copy mt-5 max-w-3xl text-base md:text-lg">
              A compliance-first digital infrastructure for Rabino Holdings Corporation, designed around
              real business utility, verifiable records, customer identity, and controlled Web3 expansion.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Web3Button href="#whitepaper-content">Read White Paper</Web3Button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-[rgba(212,175,55,.35)] bg-[linear-gradient(145deg,var(--rhc-surface-secondary),var(--rhc-surface))] p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
                  <p className="rhc-eyebrow">{label}</p>
                  <p className="mt-2 font-bold text-[var(--rhc-heading)]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
              <p className="rhc-eyebrow">Strategic Direction</p>
              <p className="mt-3 text-xl font-black leading-tight text-[var(--rhc-heading)]">
                One RHC Account · One Digital ID · One Ecosystem
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <Card title="Core Principles" className="rhc-card-token">
          <div className="grid gap-3">
            {principles.map((principle, index) => (
              <div key={principle} className="flex items-center gap-3 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--rhc-accent-soft)] text-xs font-black text-[var(--rhc-primary)]">
                  {index + 1}
                </span>
                <p className="font-bold text-[var(--rhc-heading)]">{principle}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Important Notice">
          <p className="text-sm leading-7 text-[var(--rhc-muted)]">
            This document is a strategic and technical concept paper. It is not an offer to sell
            securities, crypto-assets, investment contracts, or any financial product, and it does not
            constitute legal, tax, accounting, or investment advice.
          </p>
          <div className="mt-5 rounded-xl border border-[rgba(212,175,55,.35)] bg-[var(--rhc-accent-soft)] p-4">
            <p className="text-sm font-bold text-[var(--rhc-heading)]">
              No public token issuance is authorized under this version.
            </p>
          </div>
        </Card>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[20rem_1fr]">
        <aside className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 shadow-sm xl:h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between gap-3">
            <p className="rhc-eyebrow">Table of Contents</p>
            <Badge tone="gold">{safeSelectedSection + 1} / {sections.length}</Badge>
          </div>
          <nav
            aria-label="White paper sections"
            className="mt-4 grid max-h-[32rem] gap-1 overflow-y-auto pr-1 xl:max-h-[calc(100vh-14rem)]"
          >
            {sections.map((section, index) => {
              const [number, ...titleParts] = section.title.split('. ');
              const active = index === safeSelectedSection;
              return (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => setSelectedSection(index)}
                  className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                    active
                      ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]'
                      : 'text-[var(--rhc-secondary-text)] hover:bg-[var(--rhc-accent-soft)] hover:text-[var(--rhc-primary)]'
                  }`}
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[var(--rhc-surface-secondary)] text-[10px] font-black text-[var(--rhc-primary)] group-hover:bg-[var(--rhc-surface)]">
                    {number}
                  </span>
                  <span>{titleParts.join('. ')}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section id="whitepaper-content">
          <article className="min-h-[calc(100vh-8rem)] rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 shadow-sm md:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--rhc-border)] pb-6">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--rhc-accent-soft)] text-xl font-black text-[var(--rhc-primary)]">
                  {activeNumber}
                </span>
                <div>
                  <p className="rhc-eyebrow">White Paper Section</p>
                  <h3 className="mt-1 text-3xl font-black text-[var(--rhc-heading)]">
                    {activeTitleParts.join('. ')}
                  </h3>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safeSelectedSection === 0}
                  onClick={() => setSelectedSection((section) => Math.max(0, section - 1))}
                  className="rounded-lg border border-[var(--rhc-border)] px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safeSelectedSection === sections.length - 1}
                  onClick={() => setSelectedSection((section) => Math.min(sections.length - 1, section + 1))}
                  className="rhc-web3-btn-primary rounded-lg px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="space-y-5 text-sm leading-7 text-[var(--rhc-muted)] md:text-base md:leading-8">
              {activeSection.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {activeSection.bullets && (
                <ul className="mt-6 grid gap-3 md:grid-cols-2">
                  {activeSection.bullets.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"
                    >
                      <span className="mr-2 text-[var(--rhc-primary)]">◆</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        </section>
      </div>

      <Card className="mt-5 rhc-card-token">
        <Badge tone="gold">End of Document</Badge>
        <h2 className="mt-4 text-3xl font-black text-[var(--rhc-heading)]">
          Real Business. Real Utility. Verifiable Records. Compliance First.
        </h2>
        <p className="rhc-body-copy mt-3">
          The Rabino Web3 Ecosystem is designed as practical digital infrastructure first, with
          blockchain and token features introduced only when justified and separately approved.
        </p>
      </Card>
    </AppShell>
  );
}
