// One scope per provider. Never share pending requests across accounts or portals.
export class RequestScope {
  private pending = new Set<AbortController>();

  invalidate() {
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
  }

  open(signal?: AbortSignal | null, timeoutMs = 10000) {
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('The request timed out. Please try again.', 'TimeoutError')), timeoutMs);
    this.pending.add(controller);
    const assertCurrent = () => controller.signal.throwIfAborted();
    return {
      signal: controller.signal,
      assertCurrent,
      // Also bound session lookup/body readers that do not themselves accept a signal.
      wait<T>(promise: Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
          const cancelled = () => reject(controller.signal.reason);
          controller.signal.addEventListener('abort', cancelled, { once: true });
          if (controller.signal.aborted) cancelled();
          promise.then(
            (value) => { if (!controller.signal.aborted) resolve(value); },
            reject,
          ).finally(() => controller.signal.removeEventListener('abort', cancelled));
        });
      },
      close: () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        this.pending.delete(controller);
      },
    };
  }
}
