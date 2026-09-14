'use client';

import { useRef, useState, type FormEvent } from 'react';
import {
  ApiError,
  Card,
  Web3Button,
  errorMessage,
  isAuthEmailConfirmed,
  useRuntime,
} from '@rhc/ui';

type Candidate = { id: string; [key: string]: unknown };
const reviewableStatuses = ['UNVERIFIED', 'PENDING', 'REJECTED'];
const referencePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/;

export function approvalBlockReason(candidate: Candidate, actorId?: string): string | null {
  if (!actorId) return 'Your application identity must be verified first.';
  if (candidate.id === actorId) return 'Self-approval is not allowed.';
  if (candidate.account_status !== 'ACTIVE') return 'An ACTIVE account is required.';
  if (!reviewableStatuses.includes(String(candidate.verification_status)))
    return candidate.verification_status === 'VERIFIED'
      ? 'Business verification is already approved.'
      : 'This business status cannot be approved.';
  if (!candidate.profile) return 'An application profile is required.';
  // Older list responses omit confirmation. Never infer it from business verification.
  if (
    candidate.auth_email_confirmed_at !== undefined &&
    !isAuthEmailConfirmed(candidate.auth_email_confirmed_at)
  )
    return 'Confirmed email is required before approval.';
  return null;
}

export function VerificationReview({
  candidate,
  done,
  cancel,
  refresh,
}: {
  candidate: Candidate;
  done: () => void;
  cancel: () => void;
  refresh: () => void;
}) {
  const { user, request } = useRuntime();
  const [reference, setReference] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const submitting = useRef(false);
  const blocked = approvalBlockReason(candidate, user?.id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || needsReview) return;
    if (blocked) {
      setError(blocked);
      return;
    }
    if (!reviewed) {
      setError('Complete the business review before approving this account.');
      return;
    }
    const reviewReference = reference.trim();
    if (!referencePattern.test(reviewReference)) {
      setError(
        'Use a 3–120 character review reference starting with a letter or number, using only letters, numbers, periods, underscores, colons, or hyphens.',
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await request<{ id: string; verification_status: string }>(
        `/admin/users/${encodeURIComponent(candidate.id)}/verification/approve`,
        {
          method: 'POST',
          body: JSON.stringify({
            expected_status: candidate.verification_status,
            review_reference: reviewReference,
          }),
        },
      );
      if (result.id !== candidate.id || result.verification_status !== 'VERIFIED')
        throw new Error(
          'The API did not confirm approval. Refresh the records before reviewing again.',
        );
      done();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setNeedsReview(true);
        setReviewed(false);
        refresh();
        setError(
          'Approval was not applied because the account changed or is no longer eligible. Cancel this review, refresh the records, and review the current account state before trying again.',
        );
      } else if (cause instanceof ApiError && cause.status === 403) {
        setError(
          'Approval was denied. Global user.manage permission is required; company or project access is not sufficient. No approval was confirmed.',
        );
      } else setError(errorMessage(cause));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Card title="Review business verification" className="mb-5">
      <form onSubmit={submit}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--rhc-muted)]">Account under review</dt>
            <dd className="font-bold">{String(candidate.email || candidate.id)}</dd>
          </div>
          <div>
            <dt className="text-[var(--rhc-muted)]">Application user ID</dt>
            <dd className="break-all font-mono">{candidate.id}</dd>
          </div>
          <div>
            <dt className="text-[var(--rhc-muted)]">Expected business status</dt>
            <dd className="font-bold">{String(candidate.verification_status)}</dd>
          </div>
          <div>
            <dt className="text-[var(--rhc-muted)]">Email confirmation</dt>
            <dd>
              {candidate.auth_email_confirmed_at === undefined
                ? 'Not returned by this list; the API will check.'
                : isAuthEmailConfirmed(candidate.auth_email_confirmed_at)
                  ? 'Confirmed'
                  : 'Not confirmed'}
            </dd>
          </div>
        </dl>
        <p className="my-4 text-sm text-[var(--rhc-muted)]">
          This approves business verification only. It does not confirm email, activate an account,
          or issue an RHC ID. Complete your authorized review outside this form. The API requires
          global user.manage permission and rejects self-approval or stale status.
        </p>
        <label className="block text-sm">
          Review reference
          <input
            name="review_reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            required
            minLength={3}
            maxLength={120}
            autoComplete="off"
            disabled={busy || needsReview}
            className="mt-2 w-full rounded-lg border p-3"
            aria-describedby="review-reference-help"
          />
        </label>
        <p id="review-reference-help" className="mt-2 text-xs text-[var(--rhc-muted)]">
          Use an existing review/ticket reference, not personal documents or sensitive evidence.
          3–120 characters; start with a letter or number; only letters, numbers, . _ : - are
          allowed.
        </p>
        <label className="my-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
            disabled={busy || needsReview}
          />
          I completed the business review for this account and confirm the reference above
        </label>
        {blocked && (
          <p className="my-4" role="alert">
            {blocked}
          </p>
        )}
        {error && (
          <p className="my-4" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Web3Button type="submit" disabled={busy || needsReview || !reviewed || Boolean(blocked)}>
            {busy ? 'Approving…' : 'Confirm approval'}
          </Web3Button>
          <Web3Button variant="secondary" disabled={busy} onClick={cancel}>
            Cancel review
          </Web3Button>
        </div>
      </form>
    </Card>
  );
}
