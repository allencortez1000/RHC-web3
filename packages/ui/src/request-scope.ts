// One scope per provider. Never share pending requests across accounts or portals.
export class RequestScope {
  private pending = new Set<AbortController>();

  invalidate() {
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
  }

  open(signal?: AbortSignal | null) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    this.pending.add(controller);
    return {
      signal: controller.signal,
      assertCurrent() {
        if (controller.signal.aborted) throw new DOMException('The request was cancelled.', 'AbortError');
      },
      close: () => {
        signal?.removeEventListener('abort', abort);
        this.pending.delete(controller);
      },
    };
  }
}
