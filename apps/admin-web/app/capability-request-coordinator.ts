'use client';

import { useLayoutEffect, useState } from 'react';

export type CoordinatedCapabilityState<T> = {
  data?: T;
  error?: string;
  loading: boolean;
};

/**
 * Coordinates every capability load path in a mounted Admin workspace.
 * A newer request invalidates all older commits, including errors and
 * revalidation results that would otherwise be used as mutation authority.
 */
export class CapabilityRequestCoordinator<T> {
  private generation = 0;

  private currentState: CoordinatedCapabilityState<T> = { loading: true };

  begin(): number {
    this.generation += 1;
    this.currentState = { ...this.currentState, loading: true, error: undefined };
    return this.generation;
  }

  isCurrent(requestId: number): boolean {
    return requestId === this.generation;
  }

  invalidate(): void {
    this.generation += 1;
  }

  commitSuccess(requestId: number, data: T): CoordinatedCapabilityState<T> | null {
    if (!this.isCurrent(requestId)) return null;
    this.currentState = { data, loading: false };
    return this.currentState;
  }

  commitError(requestId: number, error: string): CoordinatedCapabilityState<T> | null {
    if (!this.isCurrent(requestId)) return null;
    // Keep the last-known data for read display, but expose the error so every
    // mutation caller can fail closed while authority is unavailable.
    this.currentState = { ...this.currentState, error, loading: false };
    return this.currentState;
  }

  snapshot(): CoordinatedCapabilityState<T> {
    return this.currentState;
  }
}

// Intent lifetime is independent of capability authority: a fresh grant cannot
// revive a cancelled action, and an old finally must not unlock its replacement.
export class MutationIntentCoordinator {
  private generation = 0;
  private pending: number | null = null;

  begin(): number | null {
    if (this.pending !== null) return null;
    this.pending = ++this.generation;
    return this.pending;
  }

  isCurrent(intent: number): boolean {
    return this.pending === intent;
  }

  finish(intent: number): boolean {
    if (!this.isCurrent(intent)) return false;
    this.pending = null;
    return true;
  }

  invalidate(): void {
    this.generation += 1;
    this.pending = null;
  }
}

export function useMutationIntent(scope: unknown) {
  const [phase, setPhase] = useState<'idle' | 'preflight' | 'submitted'>('idle');
  const [coordinator] = useState(() => new MutationIntentCoordinator());
  useLayoutEffect(() => {
    setPhase('idle');
    return () => coordinator.invalidate();
  }, [coordinator, scope]);

  return {
    busy: phase !== 'idle',
    submitted: phase === 'submitted',
    begin() {
      const intent = coordinator.begin();
      if (intent !== null) setPhase('preflight');
      return intent;
    },
    isCurrent: (intent: number) => coordinator.isCurrent(intent),
    markSubmitted(intent: number) {
      if (!coordinator.isCurrent(intent)) return false;
      setPhase('submitted');
      return true;
    },
    finish(intent: number) {
      if (coordinator.finish(intent)) setPhase('idle');
    },
    invalidate() {
      coordinator.invalidate();
      setPhase('idle');
    },
  };
}
